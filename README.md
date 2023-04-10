# Static Site Generator

## Overview
This is a NodeJS command-line tool that can convert layouts and pages defined with Markdown, EJS, and SASS into standard HTML, CSS, and Javascript.

## Goals:
* To make adding HTML templates easy.
* Templates should optionally take parameters.
* Use inline Javascript as a templating language to allow logic (functions, variables, etc) to be defined to change the way HTML templates or markdown behave.
* To use SASS partials to only include the necessary CSS code for a certain page.
* To use Markdown to write the main content of the user's web pages.
* To use layouts for defining the boilerplate of a type of webpage.
* Should make it easy to link to every file and directory on the website.
* Allow users to write scripts in Javascript.
* To be STATIC (no server-side code, unless using Javascript to access another service)


### Current Goals:
* Allow globals (site, page, etc) to modify the content of a file with EJS
  * Solution:
  * For every file with EJS, define global variables (such as site and page) at the top of the file in EJS BEFORE converting that file to HTML or another format.
* Allow user defined front matter variables to modify a web page
  * Solution:
  * Do same thing as globals (and check if variable names conflict with globals)

* Allow user to import data (in json format) from a data folder

* Allow user to split files containing duplicate partials into multiple pages (paginate)

