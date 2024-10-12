## Video Course Page

Goal:

- a page on /courses that shows an overview of all courses; the overview page should show tiles with image, title, number of lessons in the course and the author
- clicking on a tile brings you to the course detail page, like /courses/nx-course
- the detail page has a title, author, the course description (which is rendered markdown). on the right side there's a "Contents" pane with all the lessons in the course.
- clicking on a lesson will open the lesson page, which has the content pane with the current video in bold on the left, in the center there's the video player and below it the title of the video and a video description rendered from markdown.

## Course data structure

Using markdown with a bunch of conventions:

- folder docs/videos stores all video courses
- folder for each course, like `docs/courses/nx-course`
- the `overview.md` is the entry file that will be rendered on the course detail page

Here's an example of the directory structure of a course called "pnpm nx next":

```
└─ docs/courses
   └─ pnpm-nx-next
      ├─ course.md
      ├─ intro
      │  ├─ 01-overview.md
      │  └─ 02-test.md
      └─ setup-nx
         ├─ 01-nx-init.md
         └─ 02-configure-caching.md
```
