Pod::Spec.new do |s|
  s.name           = 'BackgroundChunkTransfer'
  s.version        = '1.0.0'
  s.summary        = 'Local Expo module: native background chunked upload/download engine'
  s.description    = 'Local Expo module: native background chunked upload/download engine'
  s.license        = 'UNLICENSED'
  s.author         = ''
  s.homepage       = 'https://github.com'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.libraries = 'sqlite3'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
