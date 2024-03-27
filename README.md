# datasets-viewer

A quick and dirty viewer for previewing Apache Arrow datasets (`.arrow` files) in VS Code.

If you have ever used [Hugging Face's Datasets](https://huggingface.co/datasets/), you should be familiar with this format! This extension allows you to preview the contents of these datasets in a more human-readable format.

## Features

- Preview Apache Arrow datasets in a table viewer
- Support Strings, Integers, Floats, and Booleans and their nested structures

## Known Issues

- Only supports a limited number of data types
- Cannot know how many rows are in the dataset
