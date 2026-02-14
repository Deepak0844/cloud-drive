import fs from "fs";
import path from "path";

// Models
import File from "../models/File.js";
import Folder from "../models/Folder.js";
import User from "../models/User.js";

// Services
import FileService from "../services/file.service.js";
import SocketService from "../services/socket.service.js";

// Utils
import DbUtils from "../utils/dbUtils.js";

// Constants
import ErrorMessages from "../constants/errorMessages.js";
import StatusCodes from "../constants/statusCodes.js";

/**
 * @desc    Get all folders for current user
 * @route   GET /api/v1/folders
 * @access  Private
 */
export async function getFolders(req, res) {
  try {
    let parentId = req.query.parent;
    if (parentId === "null" || !parentId) {
      parentId = null;
    }

    const search = req.query.search || null;

    const query = { user: req.user.id };

    if (search) {
      query.name = { $regex: search, $options: "i" };
      if (parentId) {
        query.parent = parentId;
      }
    } else {
      query.parent = parentId;
    }

    const folders = await Folder.find(query);

    res.status(StatusCodes.OK).json({
      success: true,
      count: folders.length,
      data: folders,
    });
  } catch (err) {
    console.error("getFolders Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Get single folder details
 * @route   GET /api/v1/folders/:id
 * @access  Private
 */
export async function getFolderDetails(req, res) {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });
    if (!folder) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: ErrorMessages.FOLDER_NOT_FOUND,
      });
    }

    // Build breadcrumb trail
    // const breadcrumbs = [];
    const current = folder;

    const parents = [];
    let parentId = current.parent;

    while (parentId) {
      const parent = await Folder.findById(parentId);
      if (!parent) {
        break;
      }
      parents.unshift({ id: parent._id, name: parent.name });
      parentId = parent.parent;
    }

    // Add current folder
    const fullBreadcrumbs = [...parents, { id: folder._id, name: folder.name }];

    res.status(StatusCodes.OK).json({ success: true, data: { ...folder.toObject(), breadcrumbs: fullBreadcrumbs } });
  } catch (err) {
    console.error("Get Folder Details Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Create folder
 * @route   POST /api/v1/folders
 * @access  Private
 */
export async function createFolder(req, res) {
  try {
    const { name, parent } = req.body;

    if (!name) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Please provide a folder name",
      });
    }

    let path = "/";
    if (parent) {
      const parentFolder = await Folder.findById(parent);
      if (!parentFolder) {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          error: "Parent folder not found",
        });
      }
      path = parentFolder.path === "/" ? `/${parentFolder.name}` : `${parentFolder.path}/${parentFolder.name}`;
    }

    const folder = await Folder.create({
      name,
      user: req.user.id,
      parent: parent || null,
      path,
    });

    res.status(StatusCodes.CREATED).json({
      success: true,
      data: folder,
    });

    // Emit socket event
    SocketService.emitToUser(req.user.id, "FOLDER_CHANGE", {
      action: "CREATE",
      folderId: folder._id,
      parentId: folder.parent,
    });
  } catch (err) {
    console.error("createFolder Error:", err);
    if (err.code === 11000) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Folder with this name already exists in this directory",
      });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Get folder contents (both subfolders and files)
 * @route   GET /api/v1/folders/:id/contents
 * @access  Private
 */
export async function getFolderContents(req, res) {
  try {
    const folderId = req.params.id === "root" ? null : req.params.id;

    const folders = await Folder.find({ user: req.user.id, parent: folderId });
    const files = await File.find({ user: req.user.id, folder: folderId, is_deleted: false });

    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        folders,
        files,
      },
    });
  } catch (err) {
    console.error("getFolderContents Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Rename folder
 * @route   PATCH /api/v1/folders/:id
 * @access  Private
 */
export async function renameFolder(req, res) {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Please provide a name",
      });
    }

    const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });
    if (!folder) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: ErrorMessages.FOLDER_NOT_FOUND,
      });
    }

    folder.name = name;
    await folder.save();

    res.status(StatusCodes.OK).json({ success: true, data: folder });

    // Emit socket event
    SocketService.emitToUser(req.user.id, "FOLDER_CHANGE", {
      action: "RENAME",
      folderId: folder._id,
      name: folder.name,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: "Folder name conflict",
      });
    }
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Delete folder (Soft delete)
 * @route   DELETE /api/v1/folders/:id
 * @access  Private
 */
export async function deleteFolder(req, res) {
  try {
    await DbUtils.softDeleteRecursive("folder", req.params.id, req.user.id, true);

    res.status(StatusCodes.OK).json({ success: true, data: {} });

    // Emit socket event
    SocketService.emitToUser(req.user.id, "FOLDER_CHANGE", {
      action: "DELETE",
      folderId: req.params.id,
    });
  } catch (err) {
    console.error("deleteFolder Error:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}

/**
 * @desc    Move folder
 * @route   POST /api/v1/folders/:id/move
 * @access  Private
 */
export async function moveFolder(req, res) {
  try {
    const { parentId } = req.body;
    const destParentId = parentId === "null" || !parentId ? null : parentId;

    const folder = await Folder.findOne({ _id: req.params.id, user: req.user.id });
    if (!folder) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: ErrorMessages.FOLDER_NOT_FOUND,
      });
    }

    // Prevent moving folder into itself or its children
    if (destParentId) {
      if (destParentId === folder._id.toString()) {
        return res.status(400).json({ success: false, error: "Cannot move folder into itself" });
      }

      // Check if destParent is a child of the current folder
      let tempParentId = destParentId;
      while (tempParentId) {
        const tempParent = await Folder.findById(tempParentId);
        if (!tempParent || !tempParent.parent) {
          break;
        }
        if (tempParent.parent.toString() === folder._id.toString()) {
          return res.status(400).json({ success: false, error: "Cannot move folder into one of its subfolders" });
        }
        tempParentId = tempParent.parent;
      }

      const destParent = await Folder.findById(destParentId);
      folder.path = destParent.path === "/" ? `/${destParent.name}` : `${destParent.path}/${destParent.name}`;
    } else {
      folder.path = "/";
    }

    folder.parent = destParentId;
    await folder.save();

    // Recursively update paths for all children
    const updateChildPaths = async (parentId, parentPath, parentName) => {
      const currentPath = parentPath === "/" ? `/${parentName}` : `${parentPath}/${parentName}`;

      // Update subfolders
      const subfolders = await Folder.find({ parent: parentId, user: req.user.id });
      for (const sub of subfolders) {
        sub.path = currentPath;
        await sub.save();
        await updateChildPaths(sub._id, sub.path, sub.name);
      }
    };

    await updateChildPaths(folder._id, folder.path, folder.name);

    res.status(200).json({ success: true, data: folder });

    // Emit socket event
    SocketService.emitToUser(req.user.id, "FOLDER_CHANGE", {
      action: "MOVE",
      folderId: folder._id,
      destParentId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server Error" });
  }
}

/**
 * @desc    Copy folder (Recursive)
 * @route   POST /api/v1/folders/:id/copy
 * @access  Private
 */
export async function copyFolder(req, res) {
  try {
    const { parentId } = req.body;
    const destParentId = parentId === "null" || !parentId ? null : parentId;

    const sourceFolder = await Folder.findOne({ _id: req.params.id, user: req.user.id });
    if (!sourceFolder) {
      return res.status(404).json({ success: false, error: "Folder not found" });
    }

    // recursive copy function
    const copyFolderRecursive = async (folderToCopy, newParentId) => {
      // 1. Create the folder copy
      let newPath = "/";
      if (newParentId) {
        const parentFolder = await Folder.findById(newParentId);
        if (parentFolder) {
          newPath = parentFolder.path === "/" ? `/${parentFolder.name}` : `${parentFolder.path}/${parentFolder.name}`;
        }
      }

      const newFolder = await Folder.create({
        name: folderToCopy.name,
        user: req.user.id,
        parent: newParentId,
        path: newPath,
      });

      // 2. Copy all files in this folder
      const files = await File.find({ folder: folderToCopy._id, user: req.user.id, is_deleted: false });

      const user = await User.findById(req.user.id);

      for (const file of files) {
        const newFileName = `${Date.now()}-${file.name}`;
        const destDir = FileService.getUserDir(req.user.id);
        const newStoragePath = path.join(destDir, newFileName);

        try {
          if (fs.existsSync(file.storage_path)) {
            fs.copyFileSync(file.storage_path, newStoragePath);

            await File.create({
              name: file.name,
              original_name: file.original_name,
              user: req.user.id,
              folder: newFolder._id,
              mime_type: file.mime_type,
              size_bytes: file.size_bytes,
              storage_path: newStoragePath,
              thumbnail_path: file.thumbnail_path,
            });

            user.used_bytes += file.size_bytes;
          }
        } catch (e) {
          console.error(`Failed to copy file ${file._id}:`, e);
        }
      }
      await user.save();

      // 3. Copy subfolders
      const subfolders = await Folder.find({ parent: folderToCopy._id, user: req.user.id });
      for (const sub of subfolders) {
        await copyFolderRecursive(sub, newFolder._id);
      }

      return newFolder;
    };

    await copyFolderRecursive(sourceFolder, destParentId);

    res.status(StatusCodes.OK).json({ success: true, message: "Folder copied successfully" });
  } catch (err) {
    console.error(err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ErrorMessages.SERVER_ERROR,
    });
  }
}
