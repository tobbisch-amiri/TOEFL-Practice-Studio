# TOEFL Practice Studio

A small local practice app for TOEFL speaking and writing drills.

This project is designed to work by simply opening one HTML file in your browser. There is no backend, no database, and no server to start.

## Files

- `practice.html`: the main file to open in your browser
- `styles.css`: app styling
- `app.js`: app logic

## How To Start

1. Open `practice.html` in your browser.
2. Start practicing right away.

You do not need to run any terminal command or local server.

## What The App Includes

### Speaking Practice

- Drag and drop any audio or video file
- Custom media controls for play, pause, seeking, time display, and `10s` jumps
- A `Repeat` control that replays the exact segment between your last play point and your latest pause point
- Microphone recording using your browser microphone
- Playback for your recorded response
- Download and clear controls for your latest recording

### Writing Practice

- A Markdown area where you can write and then preview with the `OK` button
- A timed plain-text writing area
- Minute input, start/stop timer, and live countdown
- Automatic lock when time ends
- Live word count
- Copy button for copying your written response
- Spellcheck disabled in the timed writing field for cleaner exam-style practice

## How To Use

### Speaking Tab

1. Open the `Speaking` tab.
2. Drop an audio or video file into the media area, or click to choose a file.
3. Use `Play`, `Back 10s`, `Forward 10s`, and the seek bar to move through the prompt.
4. Pause at any point to create a repeatable practice segment.
5. Press `Repeat` to replay exactly the section from your last play point to your current pause point, and it will stop at the same pause point again so you can repeat it as many times as you want.
6. Press `Play` again when you want to continue forward and create a new repeat segment from that point.
7. Click `Start Recording` to record your response.
8. Allow microphone access when your browser asks.
9. Click `Stop Recording` when you finish.
10. Use the playback controls to listen to your recording.
11. Use `Download Recording` if you want to save it.
12. Use `Clear Recording` if you want to remove it and make another try.

### Writing Tab

#### Markdown Area

1. Write notes, outlines, or prompts in the Markdown section.
2. Click `OK` to switch to preview mode.
3. Click `Back to Editing` if you want to change the text.

#### Timed Writing Area

1. Set the number of minutes.
2. Click `Start Timer`.
3. Write your response in the plain-text area.
4. Watch the countdown in the top row.
5. When time ends, the writing field is disabled and a message appears.
6. If you wrote something, the `Copy` button appears in the writing header.
7. Click `Copy` to copy your response exactly as written.

## Notes

- Everything is in memory only unless you download a recording yourself.
- Refreshing or closing the page resets the app state.
- Microphone recording depends on browser support for `getUserMedia` and `MediaRecorder`.
- The app includes CDN links for Tailwind and Markdown rendering, but the core project remains local and simple to open.

## Best Way To Use It

- Use the speaking side to shadow short clips, then loop the last played segment with `Repeat` until it feels natural
- Use the writing timer for fast essay drills
- Copy your writing into another tool if you want outside scoring or review
- Repeat often with short daily sessions
