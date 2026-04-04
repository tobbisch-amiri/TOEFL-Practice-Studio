    // Small helper for consistent time displays across media and timers.
    function formatTime(totalSeconds) {
      if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
        return "00:00";
      }

      const minutes = Math.floor(totalSeconds / 60);
      const seconds = Math.floor(totalSeconds % 60);
      return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    }

    // Escape HTML before using the local Markdown fallback.
    function escapeHtml(value) {
      return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    // Lightweight offline Markdown fallback in case the CDN version of marked.js is unavailable.
    function fallbackMarkdown(markdown) {
      const escaped = escapeHtml(markdown).replace(/\r\n?/g, "\n");
      const blocks = escaped.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);

      function formatInline(text) {
        return text
          .replace(/`([^`]+)`/g, "<code>$1</code>")
          .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
          .replace(/\*([^*]+)\*/g, "<em>$1</em>")
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      }

      return blocks.map((block) => {
        if (/^###\s+/.test(block)) {
          return "<h3>" + formatInline(block.replace(/^###\s+/, "")) + "</h3>";
        }

        if (/^##\s+/.test(block)) {
          return "<h2>" + formatInline(block.replace(/^##\s+/, "")) + "</h2>";
        }

        if (/^#\s+/.test(block)) {
          return "<h1>" + formatInline(block.replace(/^#\s+/, "")) + "</h1>";
        }

        if (/^>\s+/m.test(block)) {
          const quote = block.split("\n").map((line) => line.replace(/^>\s?/, "")).join("<br>");
          return "<blockquote>" + formatInline(quote) + "</blockquote>";
        }

        if (/^(-|\*)\s+/m.test(block)) {
          const items = block.split("\n").map((line) => line.replace(/^(-|\*)\s+/, "").trim()).filter(Boolean);
          return "<ul>" + items.map((item) => "<li>" + formatInline(item) + "</li>").join("") + "</ul>";
        }

        if (/^\d+\.\s+/m.test(block)) {
          const items = block.split("\n").map((line) => line.replace(/^\d+\.\s+/, "").trim()).filter(Boolean);
          return "<ol>" + items.map((item) => "<li>" + formatInline(item) + "</li>").join("") + "</ol>";
        }

        if (/^```/.test(block) && /```$/.test(block)) {
          const code = block.replace(/^```[\w-]*\n?/, "").replace(/\n?```$/, "");
          return "<pre><code>" + code + "</code></pre>";
        }

        return "<p>" + formatInline(block.replace(/\n/g, "<br>")) + "</p>";
      }).join("\n");
    }

    document.addEventListener("DOMContentLoaded", () => {
      const tabs = document.querySelectorAll(".tab-button");
      const panels = document.querySelectorAll(".panel");

      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          const target = tab.dataset.target;

          tabs.forEach((button) => {
            const isActive = button === tab;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", String(isActive));
          });

          panels.forEach((panel) => {
            panel.classList.toggle("is-active", panel.id === "panel-" + target);
          });
        });
      });

      // ---------- Speaking: media player ----------
      const dropZone = document.getElementById("drop-zone");
      const mediaInput = document.getElementById("media-input");
      const mediaStage = document.getElementById("media-stage");
      const mediaFrame = document.getElementById("media-frame");
      const mediaStatus = document.getElementById("media-status");
      const mediaToggle = document.getElementById("media-toggle");
      const mediaSeek = document.getElementById("media-seek");
      const mediaTime = document.getElementById("media-time");
      const changeMedia = document.getElementById("change-media");

      let mediaElement = null;
      let mediaObjectUrl = null;

      function setMediaStatus(message, tone) {
        mediaStatus.textContent = message || "";
        mediaStatus.className = "status-message" + (tone ? " " + tone : "");
      }

      function clearCurrentMedia() {
        if (mediaElement) {
          mediaElement.pause();
          mediaElement.removeAttribute("src");
          mediaElement.load();
          mediaElement.remove();
          mediaElement = null;
        }

        if (mediaObjectUrl) {
          URL.revokeObjectURL(mediaObjectUrl);
          mediaObjectUrl = null;
        }

        mediaToggle.textContent = "Play";
        mediaToggle.disabled = true;
        mediaSeek.value = 0;
        mediaSeek.disabled = true;
        mediaTime.textContent = "00:00 / 00:00";
      }

      function updateMediaProgress() {
        if (!mediaElement || !Number.isFinite(mediaElement.duration)) {
          mediaSeek.value = 0;
          mediaTime.textContent = "00:00 / 00:00";
          return;
        }

        const percentage = (mediaElement.currentTime / mediaElement.duration) * 100;
        mediaSeek.value = percentage || 0;
        mediaTime.textContent = formatTime(mediaElement.currentTime) + " / " + formatTime(mediaElement.duration);
        mediaToggle.textContent = mediaElement.paused ? "Play" : "Pause";
      }

      function detectMediaKind(file) {
        const lowerName = file.name.toLowerCase();

        if (file.type.startsWith("video/")) {
          return "video";
        }

        if (file.type.startsWith("audio/")) {
          return "audio";
        }

        if (/\.(mp4|mov|webm|m4v|ogv|avi|mkv)$/i.test(lowerName)) {
          return "video";
        }

        if (/\.(mp3|wav|m4a|aac|ogg|opus|flac|webm)$/i.test(lowerName)) {
          return "audio";
        }

        return null;
      }

      function buildMediaCard(file) {
        const mediaKind = detectMediaKind(file);

        if (!mediaKind) {
          setMediaStatus("Please choose a valid audio or video file.", "error");
          return;
        }

        clearCurrentMedia();
        mediaFrame.innerHTML = "";
        mediaObjectUrl = URL.createObjectURL(file);
        const isVideo = mediaKind === "video";

        if (isVideo) {
          const wrapper = document.createElement("div");
          wrapper.className = "video-wrapper";

          mediaElement = document.createElement("video");
          mediaElement.src = mediaObjectUrl;
          mediaElement.preload = "metadata";
          mediaElement.playsInline = true;
          mediaElement.controls = false;

          wrapper.appendChild(mediaElement);
          mediaFrame.appendChild(wrapper);
        } else {
          const placeholder = document.createElement("div");
          placeholder.className = "audio-placeholder";
          placeholder.innerHTML = `
            <div>
              <div class="placeholder-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18V5l12-2v13"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="16" r="3"></circle>
                </svg>
              </div>
              <h3>${escapeHtml(file.name)}</h3>
              <p>Audio prompt loaded. Use the custom controls below to listen, pause, and scrub precisely while you practice repeating naturally.</p>
            </div>
          `;

          mediaElement = document.createElement("audio");
          mediaElement.src = mediaObjectUrl;
          mediaElement.preload = "metadata";
          mediaElement.controls = false;
          mediaElement.className = "visually-hidden";

          placeholder.appendChild(mediaElement);
          mediaFrame.appendChild(placeholder);
        }

        mediaElement.addEventListener("loadedmetadata", () => {
          mediaToggle.disabled = false;
          mediaSeek.disabled = false;
          updateMediaProgress();
        });

        mediaElement.addEventListener("timeupdate", updateMediaProgress);
        mediaElement.addEventListener("play", updateMediaProgress);
        mediaElement.addEventListener("pause", updateMediaProgress);
        mediaElement.addEventListener("ended", () => {
          mediaElement.currentTime = 0;
          updateMediaProgress();
        });

        mediaElement.addEventListener("error", () => {
          setMediaStatus("This file could not be played in your browser.", "error");
        });

        dropZone.style.display = "none";
        mediaStage.classList.add("is-visible");
        setMediaStatus(isVideo ? "Video loaded. Press play when you are ready." : "Audio loaded. Press play when you are ready.", "success");
      }

      function handleMediaFiles(files) {
        const file = files && files[0];
        if (!file) {
          return;
        }

        buildMediaCard(file);
      }

      dropZone.addEventListener("click", () => mediaInput.click());
      changeMedia.addEventListener("click", () => mediaInput.click());

      dropZone.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          mediaInput.click();
        }
      });

      ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
          event.preventDefault();
          dropZone.classList.add("is-dragover");
        });
      });

      ["dragleave", "dragend", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
          event.preventDefault();
          dropZone.classList.remove("is-dragover");
        });
      });

      dropZone.addEventListener("drop", (event) => {
        handleMediaFiles(event.dataTransfer.files);
      });

      mediaInput.addEventListener("change", () => {
        handleMediaFiles(mediaInput.files);
        mediaInput.value = "";
      });

      mediaToggle.addEventListener("click", async () => {
        if (!mediaElement) {
          return;
        }

        try {
          if (mediaElement.paused) {
            await mediaElement.play();
          } else {
            mediaElement.pause();
          }
        } catch (error) {
          setMediaStatus("Playback could not start. Try pressing play again.", "error");
        }
      });

      mediaSeek.addEventListener("input", () => {
        if (!mediaElement || !Number.isFinite(mediaElement.duration)) {
          return;
        }

        mediaElement.currentTime = (Number(mediaSeek.value) / 100) * mediaElement.duration;
        updateMediaProgress();
      });

      // ---------- Speaking: recorder ----------
      const micOrb = document.getElementById("mic-orb");
      const recordButton = document.getElementById("record-button");
      const recordingLive = document.getElementById("recording-live");
      const recordingStage = document.getElementById("recording-stage");
      const recordingStatus = document.getElementById("recording-status");
      const recordingToggle = document.getElementById("recording-toggle");
      const recordingSeek = document.getElementById("recording-seek");
      const recordingTime = document.getElementById("recording-time");
      const downloadRecording = document.getElementById("download-recording");
      const clearRecording = document.getElementById("clear-recording");

      let mediaRecorder = null;
      let recorderStream = null;
      let recordingChunks = [];
      let isRecording = false;
      let recordingElapsedSeconds = 0;
      let recordingTimerId = null;
      let recordingBlobUrl = null;
      let recordingAudio = null;

      function setRecordingStatus(message, tone) {
        recordingStatus.textContent = message || "";
        recordingStatus.className = "status-message" + (tone ? " " + tone : "");
      }

      function resetRecordingPlaybackState() {
        recordingToggle.textContent = "Play";
        recordingSeek.value = 0;
        recordingSeek.disabled = true;
        recordingToggle.disabled = true;
        downloadRecording.disabled = true;
        clearRecording.disabled = true;
        recordingTime.textContent = "00:00 / 00:00";
      }

      function clearRecordingAudio() {
        if (recordingAudio) {
          recordingAudio.pause();
          recordingAudio.removeAttribute("src");
          recordingAudio.load();
          recordingAudio = null;
        }

        if (recordingBlobUrl) {
          URL.revokeObjectURL(recordingBlobUrl);
          recordingBlobUrl = null;
        }

        recordingStage.classList.remove("is-visible");
        resetRecordingPlaybackState();
      }

      function stopRecorderStream() {
        if (recorderStream) {
          recorderStream.getTracks().forEach((track) => track.stop());
          recorderStream = null;
        }
      }

      function updateRecordingLive() {
        if (!isRecording) {
          recordingLive.textContent = "";
          recordingLive.classList.remove("is-active");
          return;
        }

        recordingLive.textContent = "Recording... " + formatTime(recordingElapsedSeconds);
        recordingLive.classList.add("is-active");
      }

      function setRecordingUI(recordingState) {
        isRecording = recordingState;
        micOrb.classList.toggle("is-recording", recordingState);
        recordButton.textContent = recordingState ? "Stop Recording" : "Start Recording";
        recordButton.classList.toggle("button-danger", recordingState);
        recordButton.classList.toggle("button-primary", !recordingState);
        updateRecordingLive();
      }

      function updateRecordingProgress() {
        if (!recordingAudio || !Number.isFinite(recordingAudio.duration)) {
          recordingSeek.value = 0;
          recordingTime.textContent = "00:00 / 00:00";
          return;
        }

        recordingSeek.value = (recordingAudio.currentTime / recordingAudio.duration) * 100 || 0;
        recordingTime.textContent = formatTime(recordingAudio.currentTime) + " / " + formatTime(recordingAudio.duration);
        recordingToggle.textContent = recordingAudio.paused ? "Play" : "Pause";
      }

      function createRecordingPreview(blob) {
        clearRecordingAudio();

        recordingBlobUrl = URL.createObjectURL(blob);
        recordingAudio = new Audio(recordingBlobUrl);
        recordingAudio.preload = "metadata";

        recordingAudio.addEventListener("loadedmetadata", () => {
          recordingStage.classList.add("is-visible");
          recordingToggle.disabled = false;
          recordingSeek.disabled = false;
          downloadRecording.disabled = false;
          clearRecording.disabled = false;
          updateRecordingProgress();
        });

        recordingAudio.addEventListener("timeupdate", updateRecordingProgress);
        recordingAudio.addEventListener("play", updateRecordingProgress);
        recordingAudio.addEventListener("pause", updateRecordingProgress);
        recordingAudio.addEventListener("ended", () => {
          recordingAudio.currentTime = 0;
          updateRecordingProgress();
        });

        recordingAudio.addEventListener("error", () => {
          setRecordingStatus("Your recording was created, but playback failed in this browser.", "error");
        });
      }

      async function startRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setRecordingStatus("This browser does not support microphone recording.", "error");
          return;
        }

        if (typeof window.MediaRecorder === "undefined") {
          setRecordingStatus("This browser supports microphone access, but not the MediaRecorder API.", "error");
          return;
        }

        setRecordingStatus("", "");

        try {
          recorderStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          clearRecordingAudio();
          recordingChunks = [];
          recordingElapsedSeconds = 0;
          updateRecordingLive();

          const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "";

          mediaRecorder = preferredMimeType
            ? new MediaRecorder(recorderStream, { mimeType: preferredMimeType })
            : new MediaRecorder(recorderStream);

          mediaRecorder.addEventListener("dataavailable", (event) => {
            if (event.data.size > 0) {
              recordingChunks.push(event.data);
            }
          });

          mediaRecorder.addEventListener("stop", () => {
            const mimeType = mediaRecorder.mimeType || "audio/webm";
            const blob = new Blob(recordingChunks, { type: mimeType });
            createRecordingPreview(blob);
            stopRecorderStream();
            // setRecordingStatus("Recording captured. You can play, download, or clear it below.", "success");
          });

          mediaRecorder.start();
          recordingTimerId = window.setInterval(() => {
            recordingElapsedSeconds += 1;
            updateRecordingLive();
          }, 1000);
          setRecordingUI(true);
        } catch (error) {
          stopRecorderStream();
          const permissionMessage = error && error.name === "NotAllowedError"
            ? "Microphone permission was denied. Allow access and try again."
            : "Could not start recording. Please check your microphone and browser permissions.";
          setRecordingStatus(permissionMessage, "error");
          setRecordingUI(false);
        }
      }

      function stopRecording() {
        if (recordingTimerId) {
          window.clearInterval(recordingTimerId);
          recordingTimerId = null;
        }

        if (mediaRecorder && mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        } else {
          stopRecorderStream();
        }

        setRecordingUI(false);
      }

      recordButton.addEventListener("click", () => {
        if (isRecording) {
          stopRecording();
        } else {
          startRecording();
        }
      });

      recordingToggle.addEventListener("click", async () => {
        if (!recordingAudio) {
          return;
        }

        try {
          if (recordingAudio.paused) {
            await recordingAudio.play();
          } else {
            recordingAudio.pause();
          }
        } catch (error) {
          setRecordingStatus("Playback could not start. Try again.", "error");
        }
      });

      recordingSeek.addEventListener("input", () => {
        if (!recordingAudio || !Number.isFinite(recordingAudio.duration)) {
          return;
        }

        recordingAudio.currentTime = (Number(recordingSeek.value) / 100) * recordingAudio.duration;
        updateRecordingProgress();
      });

      downloadRecording.addEventListener("click", () => {
        if (!recordingBlobUrl) {
          return;
        }

        const anchor = document.createElement("a");
        anchor.href = recordingBlobUrl;
        anchor.download = "toefl-speaking-practice.webm";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      });

      clearRecording.addEventListener("click", () => {
        clearRecordingAudio();
        setRecordingStatus("Recording cleared. Start a new one whenever you are ready.", "success");
      });

      resetRecordingPlaybackState();
      setRecordingUI(false);

      // ---------- Writing: markdown ----------
      const markdownInput = document.getElementById("markdown-input");
      const markdownPreview = document.getElementById("markdown-preview");
      const markdownEditorView = document.getElementById("markdown-editor-view");
      const markdownPreviewView = document.getElementById("markdown-preview-view");
      const markdownPreviewButton = document.getElementById("markdown-preview-button");
      const markdownEditButton = document.getElementById("markdown-edit-button");

      function renderMarkdown(markdown) {
        if (!markdown.trim()) {
          markdownPreview.innerHTML = '<p class="preview-empty">Your rendered Markdown preview will appear here.</p>';
          return;
        }

        if (window.marked && typeof window.marked.parse === "function") {
          markdownPreview.innerHTML = window.marked.parse(markdown, {
            breaks: true,
            gfm: true
          });
        } else {
          markdownPreview.innerHTML = fallbackMarkdown(markdown);
        }
      }

      function showMarkdownEditor() {
        markdownEditorView.hidden = false;
        markdownPreviewView.hidden = true;
        markdownInput.focus();
      }

      function showMarkdownPreview() {
        renderMarkdown(markdownInput.value);
        markdownEditorView.hidden = true;
        markdownPreviewView.hidden = false;
      }

      markdownPreviewButton.addEventListener("click", showMarkdownPreview);
      markdownEditButton.addEventListener("click", showMarkdownEditor);

      markdownInput.addEventListener("keydown", (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          showMarkdownPreview();
        }
      });

      renderMarkdown(markdownInput.value);

      // ---------- Writing: timed plain text ----------
      const timerMinutes = document.getElementById("timer-minutes");
      const startTimerButton = document.getElementById("start-timer");
      const stopTimerButton = document.getElementById("stop-timer");
      const countdownTime = document.getElementById("countdown-time");
      const countdownNote = document.getElementById("countdown-note");
      const plainTextInput = document.getElementById("plain-text-input");
      const wordCount = document.getElementById("word-count");
      const copyWritingButton = document.getElementById("copy-writing");

      let timerId = null;
      let remainingSeconds = Number(timerMinutes.value) * 60;
      let timerRunning = false;

      function setCountdownNote(message, tone) {
        if (!countdownNote) {
          return;
        }

        countdownNote.textContent = message;
        countdownNote.className = "countdown-note" + (tone ? " " + tone : "");
      }

      function updateCopyButtonVisibility(words) {
        if (!copyWritingButton) {
          return;
        }

        copyWritingButton.hidden = words === 0;
        if (words === 0) {
          copyWritingButton.textContent = "Copy";
        }
      }

      function updateTextCounts() {
        const text = plainTextInput.value;
        const trimmed = text.trim();
        const words = trimmed ? trimmed.split(/\s+/).length : 0;

        wordCount.textContent = String(words);
        updateCopyButtonVisibility(words);
      }

      function updateCountdownDisplay() {
        countdownTime.textContent = formatTime(remainingSeconds);

        if (!timerRunning) {
          if (plainTextInput.disabled) {
            setCountdownNote("Time's up! The writing time is over.", "is-danger");
          } else {
            setCountdownNote("Set your time and press start when you are ready.");
          }
          return;
        }

        if (remainingSeconds <= 60) {
          setCountdownNote("Final minute. Keep your conclusion clear and concise.", "is-alert");
        } else {
          setCountdownNote("Timer is running. Focus on flow, structure, and finishing within the limit.");
        }
      }

      function syncTimerControls() {
        startTimerButton.hidden = timerRunning;
        stopTimerButton.hidden = !timerRunning;
        startTimerButton.disabled = timerRunning;
        timerMinutes.disabled = timerRunning;
      }

      function resetTimerFromInput() {
        const minutes = Math.max(1, Number(timerMinutes.value) || 10);
        timerMinutes.value = String(minutes);
        remainingSeconds = minutes * 60;
        plainTextInput.disabled = false;
        timerRunning = false;
        if (timerId) {
          window.clearInterval(timerId);
          timerId = null;
        }
        syncTimerControls();
        updateCountdownDisplay();
      }

      function finishTimer() {
        if (timerId) {
          window.clearInterval(timerId);
          timerId = null;
        }

        timerRunning = false;
        remainingSeconds = 0;
        plainTextInput.disabled = true;
        syncTimerControls();
        updateCountdownDisplay();
      }

      function startTimer() {
        const minutes = Number(timerMinutes.value);

        if (!Number.isFinite(minutes) || minutes <= 0) {
          setCountdownNote("Please enter a valid number of minutes.", "is-danger");
          return;
        }

        remainingSeconds = Math.round(minutes * 60);
        plainTextInput.disabled = false;
        timerRunning = true;
        syncTimerControls();
        updateCountdownDisplay();

        timerId = window.setInterval(() => {
          remainingSeconds -= 1;

          if (remainingSeconds <= 0) {
            finishTimer();
            return;
          }

          updateCountdownDisplay();
        }, 1000);
      }

      startTimerButton.addEventListener("click", startTimer);

      stopTimerButton.addEventListener("click", () => {
        resetTimerFromInput();
        setCountdownNote("Timer stopped early. You can adjust the minutes and start again.");
      });

      timerMinutes.addEventListener("input", resetTimerFromInput);
      plainTextInput.addEventListener("input", updateTextCounts);
      copyWritingButton.addEventListener("click", async () => {
        const text = plainTextInput.value;

        if (!text.trim()) {
          return;
        }

        try {
          if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
            await navigator.clipboard.writeText(text);
          } else {
            const helper = document.createElement("textarea");
            helper.value = text;
            helper.setAttribute("readonly", "");
            helper.style.position = "fixed";
            helper.style.opacity = "0";
            helper.style.pointerEvents = "none";
            document.body.appendChild(helper);
            helper.focus();
            helper.select();
            document.execCommand("copy");
            helper.remove();
          }

          copyWritingButton.textContent = "Copied";
          window.setTimeout(() => {
            if (!copyWritingButton.hidden) {
              copyWritingButton.textContent = "Copy";
            }
          }, 1400);
        } catch (error) {
          copyWritingButton.textContent = "Copy Failed";
          window.setTimeout(() => {
            if (!copyWritingButton.hidden) {
              copyWritingButton.textContent = "Copy";
            }
          }, 1600);
        }
      });

      updateTextCounts();
      resetTimerFromInput();

      // Cleanup object URLs and media streams if the page closes or reloads.
      window.addEventListener("beforeunload", () => {
        clearCurrentMedia();
        clearRecordingAudio();
        stopRecorderStream();
      });
    });
