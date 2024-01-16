# Scraper Archive

These are files that have been archived and are no longer in service.  Primarily these have been folded into the server and thus their individual functionality is no longer needed.

| File | Archival Justification |
| :-: | --- |
| `duplicate-content.js` | This was used to clean out duplicate records in the `database.json` file which has been replaced with an actual database |
| `convert-to-media.js` | This was a partial script that would have looked through the `database.json` and converted any HTML documents into images/videos since sites like RedGif host their own webpage and display the media inside.  This was fleshed out int he Reddit Parser Service |
| `getSubReddits.js` | This was a simple analysis tool for the `database.json` file.  With the retirement of the `database.json` file it is no longer needed |
| `index.js` | This was the original downloader for Reddit Posts.  This is now part of the Reddit Service |
| `upload.js` | This was originally used to upload documents from the `output` directory to the server running in my homelab. This has be deprecated as it is no longer correctly interfacing with the service |

