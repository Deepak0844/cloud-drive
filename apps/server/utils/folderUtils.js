// Models
import Folder from "#models/Folder.js";

/**
 * Generate breadcrumbs for a folder by traversing up the hierarchy
 * @param {Object} folder - Folder document
 * @returns {Promise<Array>} Array of breadcrumb objects with id and name
 */
export async function generateBreadcrumbs(folder) {
  const parents = [];
  let currentParentId = folder.parent;

  // Traverse up the folder hierarchy
  while (currentParentId) {
    const parent = await Folder.findById(currentParentId);
    if (!parent) {
      break;
    }

    parents.unshift({ id: parent._id, name: parent.name });
    currentParentId = parent.parent;
  }

  // Add current folder at the end
  return [...parents, { id: folder._id, name: folder.name }];
}

/**
 * Calculate the full path for a folder based on its parent
 * @param {string|null} parentId - Parent folder ID (null for root)
 * @returns {Promise<string>} Full folder path
 * @throws {Error} If parent folder not found
 */
export async function calculateFolderPath(parentId) {
  if (!parentId) {
    return "/";
  }

  const parentFolder = await Folder.findById(parentId);
  if (!parentFolder) {
    throw new Error("Parent folder not found");
  }

  // Build path: if parent is root ("/"), just add name, otherwise append to existing path
  return parentFolder.path === "/" ? `/${parentFolder.name}` : `${parentFolder.path}/${parentFolder.name}`;
}

/**
 * Validate folder hierarchy to prevent circular references
 * @param {string} folderId - Folder being moved
 * @param {string|null} targetParentId - Target parent folder ID
 * @returns {Promise<boolean>} True if valid, false if circular reference detected
 */
export async function validateFolderHierarchy(folderId, targetParentId) {
  if (!targetParentId) {
    return true; // Moving to root is always valid
  }

  if (folderId === targetParentId) {
    return false; // Can't move folder into itself
  }

  // Check if target parent is a descendant of the folder being moved
  let currentParentId = targetParentId;

  while (currentParentId) {
    if (currentParentId === folderId) {
      return false; // Circular reference detected
    }

    const parent = await Folder.findById(currentParentId);
    if (!parent) {
      break;
    }

    currentParentId = parent.parent;
  }

  return true;
}

/**
 * Get all ancestor folder IDs for a given folder
 * @param {string} folderId - Folder ID
 * @returns {Promise<string[]>} Array of ancestor folder IDs (from root to immediate parent)
 */
export async function getAncestorIds(folderId) {
  const ancestors = [];
  const folder = await Folder.findById(folderId);

  if (!folder) {
    return ancestors;
  }

  let currentParentId = folder.parent;

  while (currentParentId) {
    ancestors.unshift(currentParentId);
    const parent = await Folder.findById(currentParentId);
    if (!parent) {
      break;
    }
    currentParentId = parent.parent;
  }

  return ancestors;
}

// Exports
const FolderUtils = {
  generateBreadcrumbs,
  calculateFolderPath,
  validateFolderHierarchy,
  getAncestorIds,
};

export default FolderUtils;
