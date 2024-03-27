# datasets-viewer

A quick and dirty viewer for previewing Apache Arrow datasets (`.arrow` files) in VS Code.

If you have ever used [Hugging Face's Datasets](https://huggingface.co/datasets/), you should be familiar with this format! This extension allows you to preview the contents of these datasets in a more human-readable format.


## Why not I use X?

"So, why another viewer extension? There should be a few of them out there, right?"

Well, yes and no. I was looking for a way to preview Apache Arrow datasets in VS Code, and **I couldn't find any extension that did that just right**. So, I decided to make my own!

- [vscode-data-preview](https://github.com/RandomFractals/vscode-data-preview): Very popular and support many formats. But it has been **abandoned for a year, and opening large arrow files can be awfully slow** or even crash the extension.
- [vscode-arrow-viewer](https://github.com/cwharris/vscode-arrow-viewer): A very simple viewer for arrow files. **Has only \<5 commits and outdated for \>5 years**. Scoring 1/5 on vscode marketplace.

## Features

- Preview Apache Arrow datasets in a table viewer
- Designed to be fast and responsive. Can handle large datasets with ease
- Support Strings, Integers, Floats, and Booleans and their nested structures

## Known Issues

- Only supports a limited number of data types
- Cannot know how many rows are in the dataset
