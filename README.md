# SCA Course Library

Digital courses for the LMS on the Career website (career.studentcompanionai.rw).
Courses live here on GitHub; the website lists and plays them automatically.

## How it works

1. Each folder in `courses/` is one course: an Articulate Rise export, unzipped.
2. On every push to `main`, GitHub Actions runs `scripts/build-catalog.mjs`, which reads each
   course's title, description, lessons and cover image and writes `catalog.json`. It then
   publishes the repository to GitHub Pages.
3. The Career website reads `https://andrewstevenboima.github.io/SCAI-LMS/catalog.json`, shows
   every published course in its catalog, and plays it inside the LMS.

## Add a course (no coding needed)

1. In Rise, choose **Publish → Web** (or xAPI / SCORM) and download the zip.
2. Unzip it on your computer. Rename the folder to a short name with dashes, for example
   `excel-basics`.
3. On GitHub, open the `courses` folder, click **Add file → Upload files**, drag in the whole
   folder, and click **Commit changes**.
4. Optional: add `course.json` in the course folder to set the category, level, price or
   tags, or to mark it as featured:

   ```json
   {
     "category": "Digital Skills",
     "level": "Beginner",
     "price": 0,
     "currency": "RWF",
     "featured": false,
     "published": true,
     "duration": "2 hours",
     "tags": ["Excel"]
   }
   ```

   `price` above 0 makes it a paid course. `"published": false` hides it without deleting it.
5. Wait about 2 minutes (Actions tab turns green). The course now appears in the Career
   website's course catalog.

To update a course, upload the new export over the old folder. To remove it, delete the
folder or set `"published": false`.

## One-time setup

Settings → Pages → Build and deployment → Source: **GitHub Actions**.

## Check what is published

Open https://andrewstevenboima.github.io/SCAI-LMS/ to see every published course.
