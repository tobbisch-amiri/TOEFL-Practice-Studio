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

### Build The Sentence Practice

- A dedicated `Build Sentence` tab for sentence-order practice
- Paste-only intake so the numbered source sentences are captured without being shown back to you
- Support for numbered plain text or simple Markdown list formats such as `1.`, `2)`, or `3 `
- Per-sentence timer in seconds
- Full-focus practice board after start, without the intake panel staying on screen
- Mixed reveal logic: about half the set uses a regular anchor word and the other half reveals the final word
- Sentence-ending punctuation stays visible so you can tell whether the item ends with `.` or `?`
- Drag-and-drop word bank with tap-to-select and tap-to-place fallback
- Delayed scoring so correctness appears only after the full set is finished

### Complete The Words Practice

- A dedicated `Complete Words` tab for paragraph-based word-completion practice
- Paste-only intake so the source paragraph is captured without being shown back to you
- Automatic generation of `10` missing word parts inside the paragraph
- Missing letters can come from the beginning, middle, or end of a word
- Inline typing directly in the paragraph rather than in a separate answer list
- Auto-advance to the next blank when the current blank reaches its full letter count
- Click-any-gap editing so you can jump to any missing part manually
- Default paragraph timer of `2` minutes, adjustable before starting
- Review mode that shows the corrected paragraph, with correct fills in green and wrong fills visibly corrected

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

### Build Sentence Tab

1. Open the `Build Sentence` tab.
2. Set the number of seconds you want for each sentence.
3. Click the paste area.
4. Paste a numbered sentence list using `Ctrl + V` or `Cmd + V`.
5. Wait for the app to confirm how many valid sentences were captured.
6. Click `Start Practice`.
7. Build each sentence by dragging words into the blanks, or by tapping a word and then tapping a blank.
8. Watch the countdown for the current sentence.
9. Click `Next Sentence` when you want to move on early.
10. If time reaches zero, the app automatically advances to the next sentence.
11. After the final sentence, review your full results with correct and incorrect marks.
12. Use `Practice Again` to reuse the same hidden set, or `Paste New Set` to load a fresh one.

### Complete Words Tab

1. Open the `Complete Words` tab.
2. Set the number of minutes you want for the paragraph. The default is `2`.
3. Click the paste area.
4. Paste one paragraph using `Ctrl + V` or `Cmd + V`.
5. Wait for the app to confirm the paragraph was captured privately.
6. Click `Start Practice`.
7. Type the missing letters directly into each blank area inside the paragraph.
8. Let the app move your cursor forward automatically as each gap fills up, or click any gap to edit it manually.
9. Click `Finish` when you want to stop early.
10. If time reaches zero, the app opens the review automatically.
11. Review the corrected paragraph with green correct fills and visibly corrected wrong fills.
12. Use `Practice Again` to generate a fresh set of gaps from the same hidden paragraph, or `Paste New Paragraph` to load another one.

## Notes

- Everything is in memory only unless you download a recording yourself.
- Refreshing or closing the page resets the app state.
- Microphone recording depends on browser support for `getUserMedia` and `MediaRecorder`.
- The app includes CDN links for Tailwind and Markdown rendering, but the core project remains local and simple to open.
- The Build Sentence intake is designed for pasting, not editing, so the source sentences are not echoed back on screen.
- The Complete Words intake is also paste-only, so the source paragraph is not echoed back on screen.

## Best Way To Use It

- Use the speaking side to shadow short clips, then loop the last played segment with `Repeat` until it feels natural
- Use the writing timer for fast essay drills
- Use Build Sentence for quick timed sentence-order rounds from AI-generated or self-made sets
- Use Complete Words for fast context-based vocabulary and spelling practice inside one hidden paragraph
- Copy your writing into another tool if you want outside scoring or review
- Repeat often with short daily sessions
