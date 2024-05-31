# Change Log

All notable changes to the "datasets-viewer" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Fixed

- Better serialization of BigInt ans TypedArray
    - We can now correctly parse `Struct` data type with `BigInt` or `TypedArray` values
    
### Miscellaneous

- Update dependencies

## [0.0.3] - 2024-03-27

### Added

- Auto collapse when the field is too long

### Changed

- Keep webview alive when switching between tabs to avoid reloading

### Fixed

- Unable to show data with BigInt type (Temporary fix)
- Unable to go the previous page when the current page is beyond the last page

## [0.0.2] - 2024-03-27

### Removed

- Useless "Hello World" command

### Miscellaneous

- Update package.json with correct information

## [0.0.1] - 2024-03-27

- Initial release
