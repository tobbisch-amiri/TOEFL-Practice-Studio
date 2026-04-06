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

    function normalizeWhitespace(value) {
      return String(value || "").replace(/\s+/g, " ").trim();
    }

    function shuffleArray(items) {
      const clone = items.slice();

      for (let index = clone.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const current = clone[index];
        clone[index] = clone[swapIndex];
        clone[swapIndex] = current;
      }

      return clone;
    }

    function stripSimpleMarkdown(value) {
      return normalizeWhitespace(
        String(value || "")
          .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .replace(/`([^`]+)`/g, "$1")
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/\*([^*]+)\*/g, "$1")
          .replace(/__([^_]+)__/g, "$1")
          .replace(/_([^_]+)_/g, "$1")
          .replace(/^#+\s+/g, "")
          .replace(/^>\s+/g, "")
          .replace(/\\([`*_{}\[\]()#+\-.!])/g, "$1")
      );
    }

    function splitSentenceEnding(sentence) {
      const normalized = normalizeWhitespace(sentence);
      const match = normalized.match(/^(.*?)([.?!]+)$/);

      if (!match) {
        return {
          body: normalized,
          terminalPunctuation: ""
        };
      }

      const body = normalizeWhitespace(match[1]);
      return {
        body: body || normalized,
        terminalPunctuation: body ? match[2] : ""
      };
    }

    function composeSentence(words, terminalPunctuation) {
      return normalizeWhitespace(words.join(" ")) + (terminalPunctuation || "");
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
      const mediaBackward = document.getElementById("media-backward");
      const mediaForward = document.getElementById("media-forward");
      const mediaRepeat = document.getElementById("media-repeat");
      const mediaSeek = document.getElementById("media-seek");
      const mediaTime = document.getElementById("media-time");
      const changeMedia = document.getElementById("change-media");

      let mediaElement = null;
      let mediaObjectUrl = null;
      let mediaSegmentStart = 0;
      let repeatStartTime = null;
      let repeatEndTime = null;
      let repeatStopTime = null;
      let isRepeatPlayback = false;

      const MEDIA_SKIP_SECONDS = 10;
      const MIN_REPEAT_SECONDS = 0.25;
      const REPEAT_STOP_BUFFER = 0.05;

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
        mediaBackward.disabled = true;
        mediaForward.disabled = true;
        mediaRepeat.disabled = true;
        mediaSeek.value = 0;
        mediaSeek.disabled = true;
        mediaTime.textContent = "00:00 / 00:00";
        mediaSegmentStart = 0;
        repeatStartTime = null;
        repeatEndTime = null;
        repeatStopTime = null;
        isRepeatPlayback = false;
      }

      function hasRepeatSegment() {
        return Number.isFinite(repeatStartTime)
          && Number.isFinite(repeatEndTime)
          && repeatEndTime - repeatStartTime >= MIN_REPEAT_SECONDS;
      }

      function updateRepeatButton() {
        mediaRepeat.disabled = !mediaElement || !hasRepeatSegment() || !mediaElement.paused;
      }

      function clampMediaTime(targetTime) {
        if (!mediaElement || !Number.isFinite(mediaElement.duration)) {
          return 0;
        }

        return Math.min(Math.max(targetTime, 0), mediaElement.duration);
      }

      function moveMediaPlayhead(targetTime, userInitiated, preserveRepeatState) {
        if (!mediaElement || !Number.isFinite(mediaElement.duration)) {
          return;
        }

        const nextTime = clampMediaTime(targetTime);
        const wasPaused = mediaElement.paused;

        if (!preserveRepeatState) {
          isRepeatPlayback = false;
          repeatStopTime = null;
        }

        mediaElement.currentTime = nextTime;

        if (!wasPaused && userInitiated) {
          mediaSegmentStart = nextTime;
        }

        updateMediaProgress();
      }

      function captureRepeatSegment() {
        if (!mediaElement) {
          return;
        }

        const currentTime = clampMediaTime(mediaElement.currentTime);
        const segmentLength = currentTime - mediaSegmentStart;

        if (segmentLength >= MIN_REPEAT_SECONDS) {
          repeatStartTime = mediaSegmentStart;
          repeatEndTime = currentTime;
          setMediaStatus("Repeat is ready for " + formatTime(repeatStartTime) + " to " + formatTime(repeatEndTime) + ".", "success");
        }
      }

      function stopRepeatPlaybackAtBoundary() {
        if (!mediaElement || !isRepeatPlayback || !Number.isFinite(repeatStopTime)) {
          return false;
        }

        if (mediaElement.currentTime < repeatStopTime - REPEAT_STOP_BUFFER) {
          return false;
        }

        mediaElement.pause();
        mediaElement.currentTime = repeatStopTime;
        isRepeatPlayback = false;
        repeatStopTime = null;
        updateMediaProgress();
        return true;
      }

      function updateMediaProgress() {
        if (!mediaElement || !Number.isFinite(mediaElement.duration)) {
          mediaSeek.value = 0;
          mediaTime.textContent = "00:00 / 00:00";
          updateRepeatButton();
          return;
        }

        const percentage = (mediaElement.currentTime / mediaElement.duration) * 100;
        mediaSeek.value = percentage || 0;
        mediaTime.textContent = formatTime(mediaElement.currentTime) + " / " + formatTime(mediaElement.duration);
        mediaToggle.textContent = mediaElement.paused ? "Play" : "Pause";
        updateRepeatButton();
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
          mediaBackward.disabled = false;
          mediaForward.disabled = false;
          mediaSeek.disabled = false;
          updateMediaProgress();
        });

        mediaElement.addEventListener("timeupdate", () => {
          if (stopRepeatPlaybackAtBoundary()) {
            return;
          }

          updateMediaProgress();
        });
        mediaElement.addEventListener("play", () => {
          if (!isRepeatPlayback) {
            mediaSegmentStart = mediaElement.currentTime;
          }

          updateMediaProgress();
        });
        mediaElement.addEventListener("pause", () => {
          captureRepeatSegment();
          updateMediaProgress();
        });
        mediaElement.addEventListener("ended", () => {
          captureRepeatSegment();
          isRepeatPlayback = false;
          repeatStopTime = null;
          mediaElement.currentTime = Number.isFinite(mediaElement.duration) ? mediaElement.duration : mediaElement.currentTime;
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
            if (Number.isFinite(mediaElement.duration) && mediaElement.currentTime >= mediaElement.duration - REPEAT_STOP_BUFFER) {
              moveMediaPlayhead(0, false, false);
            }

            isRepeatPlayback = false;
            repeatStopTime = null;
            await mediaElement.play();
          } else {
            mediaElement.pause();
          }
        } catch (error) {
          setMediaStatus("Playback could not start. Try pressing play again.", "error");
        }
      });

      mediaBackward.addEventListener("click", () => {
        moveMediaPlayhead((mediaElement ? mediaElement.currentTime : 0) - MEDIA_SKIP_SECONDS, true, false);
      });

      mediaForward.addEventListener("click", () => {
        moveMediaPlayhead((mediaElement ? mediaElement.currentTime : 0) + MEDIA_SKIP_SECONDS, true, false);
      });

      mediaRepeat.addEventListener("click", async () => {
        if (!mediaElement || !hasRepeatSegment()) {
          return;
        }

        mediaSegmentStart = repeatStartTime;
        isRepeatPlayback = true;
        repeatStopTime = repeatEndTime;
        moveMediaPlayhead(repeatStartTime, false, true);

        try {
          await mediaElement.play();
        } catch (error) {
          isRepeatPlayback = false;
          repeatStopTime = null;
          setMediaStatus("Repeat could not start. Try pressing repeat again.", "error");
        }
      });

      mediaSeek.addEventListener("input", () => {
        if (!mediaElement || !Number.isFinite(mediaElement.duration)) {
          return;
        }

        moveMediaPlayhead((Number(mediaSeek.value) / 100) * mediaElement.duration, true, false);
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

      function hasLiveRecorderStream() {
        return Boolean(
          recorderStream &&
          recorderStream.getAudioTracks().some((track) => track.readyState === "live")
        );
      }

      function setRecorderStreamEnabled(enabled) {
        if (!recorderStream) {
          return;
        }

        recorderStream.getAudioTracks().forEach((track) => {
          if (track.readyState === "live") {
            track.enabled = enabled;
          }
        });
      }

      async function ensureRecorderStream() {
        if (hasLiveRecorderStream()) {
          return recorderStream;
        }

        recorderStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return recorderStream;
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
          const stream = await ensureRecorderStream();
          setRecorderStreamEnabled(true);
          clearRecordingAudio();
          recordingChunks = [];
          recordingElapsedSeconds = 0;
          updateRecordingLive();

          const preferredMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "";

          mediaRecorder = preferredMimeType
            ? new MediaRecorder(stream, { mimeType: preferredMimeType })
            : new MediaRecorder(stream);

          mediaRecorder.addEventListener("dataavailable", (event) => {
            if (event.data.size > 0) {
              recordingChunks.push(event.data);
            }
          });

          mediaRecorder.addEventListener("stop", () => {
            const mimeType = mediaRecorder.mimeType || "audio/webm";
            const blob = new Blob(recordingChunks, { type: mimeType });
            createRecordingPreview(blob);
            setRecorderStreamEnabled(false);
            // setRecordingStatus("Recording captured. You can play, download, or clear it below.", "success");
          });

          mediaRecorder.start();
          recordingTimerId = window.setInterval(() => {
            recordingElapsedSeconds += 1;
            updateRecordingLive();
          }, 1000);
          setRecordingUI(true);
        } catch (error) {
          setRecorderStreamEnabled(false);
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
          setRecorderStreamEnabled(false);
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

      // ---------- Writing: build the sentence ----------
      const sentenceIntakeView = document.getElementById("sentence-intake-view");
      const sentencePracticeView = document.getElementById("sentence-practice-view");
      const sentenceTimerSeconds = document.getElementById("sentence-timer-seconds");
      const sentenceQuestionCount = document.getElementById("sentence-question-count");
      const sentenceInputNote = document.getElementById("sentence-input-note");
      const sentencePasteZone = document.getElementById("sentence-paste-zone");
      const sentencePasteSummary = document.getElementById("sentence-paste-summary");
      const sentencePasteSummaryTitle = document.getElementById("sentence-paste-summary-title");
      const sentencePasteSummaryText = document.getElementById("sentence-paste-summary-text");
      const sentenceClearPaste = document.getElementById("sentence-clear-paste");
      const sentenceStartButton = document.getElementById("sentence-start-button");
      const sentenceProgressLabel = document.getElementById("sentence-progress-label");
      const sentenceTimeLeft = document.getElementById("sentence-time-left");
      const sentenceNextButton = document.getElementById("sentence-next-button");
      const sentenceSessionNote = document.getElementById("sentence-session-note");
      const sentenceQuestionStage = document.getElementById("sentence-question-stage");
      const sentencePrompt = document.getElementById("sentence-prompt");
      const sentenceBank = document.getElementById("sentence-bank");
      const sentenceResults = document.getElementById("sentence-results");
      const sentenceResultsTitle = document.getElementById("sentence-results-title");
      const sentenceResultsScore = document.getElementById("sentence-results-score");
      const sentenceResultsList = document.getElementById("sentence-results-list");
      const sentencePracticeAgain = document.getElementById("sentence-practice-again");
      const sentenceNewSet = document.getElementById("sentence-new-set");
      const sentenceStatus = document.getElementById("sentence-status");

      const sentencePracticeState = {
        preparedSentences: [],
        questions: [],
        currentIndex: -1,
        results: [],
        selectedWordId: null,
        timerId: null,
        remainingSeconds: Math.max(5, Number(sentenceTimerSeconds.value) || 45),
        secondsPerQuestion: Math.max(5, Number(sentenceTimerSeconds.value) || 45),
        sessionActive: false,
        dragWordId: null
      };

      function setSentenceStatus(message, tone) {
        sentenceStatus.textContent = message || "";
        sentenceStatus.className = "status-message" + (tone ? " " + tone : "");
      }

      function setSentenceInputMessage(message, tone) {
        sentenceInputNote.innerHTML = message;
        sentenceInputNote.className = "countdown-note" + (tone ? " " + tone : "");
      }

      function setSentenceSessionMessage(message, tone) {
        sentenceSessionNote.textContent = message || "";
        sentenceSessionNote.className = "countdown-note" + (tone ? " " + tone : "");
      }

      function showSentenceIntakeView() {
        sentenceIntakeView.hidden = false;
        sentencePracticeView.hidden = true;
      }

      function showSentencePracticeView() {
        sentenceIntakeView.hidden = true;
        sentencePracticeView.hidden = false;
      }

      function clearSentenceTimer() {
        if (sentencePracticeState.timerId) {
          window.clearInterval(sentencePracticeState.timerId);
          sentencePracticeState.timerId = null;
        }
      }

      function getSentenceSecondsSetting() {
        const seconds = Math.max(5, Math.round(Number(sentenceTimerSeconds.value) || 45));
        sentenceTimerSeconds.value = String(seconds);
        return seconds;
      }

      function updateSentenceTimeDisplay() {
        sentenceTimeLeft.textContent = formatTime(sentencePracticeState.remainingSeconds);
      }

      function updateSentenceProgressDisplay() {
        const total = sentencePracticeState.preparedSentences.length;

        if (!total) {
          sentenceProgressLabel.textContent = "0 / 0";
          return;
        }

        if (sentencePracticeState.sessionActive) {
          sentenceProgressLabel.textContent = String(sentencePracticeState.currentIndex + 1) + " / " + String(total);
          return;
        }

        if (sentencePracticeState.results.length === total && total > 0) {
          sentenceProgressLabel.textContent = String(total) + " / " + String(total);
          return;
        }

        sentenceProgressLabel.textContent = "0 / " + String(total);
      }

      function updateSentenceQuestionCount(count) {
        sentenceQuestionCount.textContent = String(count);
      }

      function extractSentencePrompts(source) {
        const pattern = /^\s*(?:\d+\s*[.):-]\s+|\d+\s+|[-*+]\s+)(.+?)\s*$/;

        return source
          .replace(/\r\n?/g, "\n")
          .split("\n")
          .map((line) => line.match(pattern))
          .filter(Boolean)
          .map((match) => stripSimpleMarkdown(match[1]))
          .filter((sentence) => sentence.split(/\s+/).length >= 2);
      }

      function setSentencePasteZoneReady(isReady, count) {
        sentencePasteZone.classList.toggle("is-ready", isReady);
        sentencePasteZone.innerHTML = isReady
          ? `
            <div>
              <strong>Set Captured</strong>
              <p>${count} numbered sentence${count === 1 ? "" : "s"} received. The original text stays hidden. Paste again here any time to replace the set.</p>
            </div>
          `
          : `
            <div>
              <strong>Paste Sentence Set</strong>
              <p>Click here, then press <kbd>Ctrl</kbd> + <kbd>V</kbd> or <kbd>Cmd</kbd> + <kbd>V</kbd>. The app will accept the pasted text but will not reveal the questions.</p>
            </div>
          `;
      }

      function resetSentencePasteState() {
        sentencePracticeState.preparedSentences = [];
        sentencePracticeState.questions = [];
        sentencePracticeState.results = [];
        sentencePracticeState.currentIndex = -1;
        sentencePracticeState.selectedWordId = null;
        sentencePracticeState.dragWordId = null;
        sentencePracticeState.sessionActive = false;
        sentencePracticeState.remainingSeconds = getSentenceSecondsSetting();
        clearSentenceTimer();
        updateSentenceQuestionCount(0);
        setSentencePasteZoneReady(false, 0);
        sentencePasteSummary.hidden = true;
        sentenceClearPaste.hidden = true;
        sentenceStartButton.hidden = true;
        sentenceStartButton.disabled = true;
        sentencePrompt.innerHTML = "";
        sentenceBank.innerHTML = "";
        sentenceResults.hidden = true;
        sentenceQuestionStage.hidden = false;
        setSentenceStatus("", "");
        updateSentenceProgressDisplay();
        updateSentenceTimeDisplay();
      }

      function refreshSentenceSessionNote() {
        if (!sentencePracticeState.sessionActive) {
          if (sentencePracticeState.results.length === sentencePracticeState.preparedSentences.length && sentencePracticeState.preparedSentences.length > 0) {
            setSentenceSessionMessage("Round finished. Review the correct sentences below or run the same set again.");
          } else {
            setSentenceSessionMessage("Your pasted set is hidden. Build each sentence before the time runs out.");
          }
          return;
        }

        if (sentencePracticeState.remainingSeconds <= 10) {
          setSentenceSessionMessage("Final 10 seconds. Lock in your order or the app will jump to the next sentence.", "is-alert");
        } else {
          setSentenceSessionMessage("Build the sentence, then press Next Sentence when you want to continue.");
        }
      }

      function syncSentencePracticeSummary() {
        updateSentenceProgressDisplay();
        updateSentenceTimeDisplay();
        refreshSentenceSessionNote();
      }

      function createSentenceQuestion(sentence, questionIndex, revealMode) {
        const sentenceParts = splitSentenceEnding(sentence);
        const words = sentenceParts.body.split(" ").filter(Boolean);
        const lastWordIndex = words.length - 1;

        let anchorIndex = lastWordIndex;
        if (revealMode !== "last" && lastWordIndex > 0) {
          const anchorCandidates = words
            .map((word, index) => (index !== lastWordIndex && /[A-Za-z0-9]/.test(word) ? index : -1))
            .filter((index) => index >= 0);

          anchorIndex = anchorCandidates.length
            ? anchorCandidates[Math.floor(Math.random() * anchorCandidates.length)]
            : 0;
        }

        const wordItems = shuffleArray(
          words
            .map((word, wordIndex) => ({
              id: "sentence-" + questionIndex + "-" + wordIndex,
              word,
              wordIndex,
              placedIndex: null
            }))
            .filter((item) => item.wordIndex !== anchorIndex)
        );

        return {
          sentence: composeSentence(words, sentenceParts.terminalPunctuation),
          words,
          terminalPunctuation: sentenceParts.terminalPunctuation,
          anchorIndex,
          revealMode,
          wordItems
        };
      }

      function buildSentenceQuestions(sentences) {
        const lastWordCount = Math.floor(sentences.length / 2);
        const shuffledIndices = shuffleArray(sentences.map((sentence, index) => index));
        const lastWordQuestionIndexes = new Set(shuffledIndices.slice(0, lastWordCount));

        return sentences.map((sentence, index) => createSentenceQuestion(
          sentence,
          index,
          lastWordQuestionIndexes.has(index) ? "last" : "random"
        ));
      }

      function getActiveSentenceQuestion() {
        return sentencePracticeState.questions[sentencePracticeState.currentIndex] || null;
      }

      function findSentenceWord(question, wordId) {
        return question ? question.wordItems.find((item) => item.id === wordId) || null : null;
      }

      function findSentenceWordInSlot(question, slotIndex) {
        return question ? question.wordItems.find((item) => item.placedIndex === slotIndex) || null : null;
      }

      function buildSentenceAnswer(question) {
        const builtWords = question.words.map((word, wordIndex) => {
          if (wordIndex === question.anchorIndex) {
            return word;
          }

          const placedWord = findSentenceWordInSlot(question, wordIndex);
          return placedWord ? placedWord.word : "_____";
        });

        return composeSentence(builtWords, question.terminalPunctuation);
      }

      function selectSentenceWord(wordId) {
        sentencePracticeState.selectedWordId = sentencePracticeState.selectedWordId === wordId ? null : wordId;
        renderSentenceQuestion();
      }

      function returnSentenceWordToBank(wordId) {
        const question = getActiveSentenceQuestion();
        const word = findSentenceWord(question, wordId);

        if (!word) {
          return;
        }

        word.placedIndex = null;
        if (sentencePracticeState.selectedWordId === wordId) {
          sentencePracticeState.selectedWordId = null;
        }

        renderSentenceQuestion();
      }

      function placeSentenceWord(wordId, slotIndex) {
        const question = getActiveSentenceQuestion();

        if (!question || slotIndex === question.anchorIndex) {
          return;
        }

        const word = findSentenceWord(question, wordId);
        if (!word) {
          return;
        }

        const previousIndex = word.placedIndex;
        const occupyingWord = findSentenceWordInSlot(question, slotIndex);

        if (previousIndex === slotIndex) {
          sentencePracticeState.selectedWordId = null;
          renderSentenceQuestion();
          return;
        }

        if (occupyingWord && occupyingWord.id !== wordId) {
          occupyingWord.placedIndex = previousIndex === null ? null : previousIndex;
        }

        word.placedIndex = slotIndex;
        sentencePracticeState.selectedWordId = null;
        renderSentenceQuestion();
      }

      function handleSentenceSlotClick(slotIndex) {
        const question = getActiveSentenceQuestion();

        if (!question || slotIndex === question.anchorIndex) {
          return;
        }

        const occupyingWord = findSentenceWordInSlot(question, slotIndex);
        if (occupyingWord) {
          returnSentenceWordToBank(occupyingWord.id);
          return;
        }

        if (sentencePracticeState.selectedWordId) {
          placeSentenceWord(sentencePracticeState.selectedWordId, slotIndex);
        }
      }

      function renderSentenceQuestion() {
        const question = getActiveSentenceQuestion();

        if (!question) {
          sentencePrompt.innerHTML = "";
          sentenceBank.innerHTML = "";
          return;
        }

        sentencePrompt.innerHTML = "";
        question.words.forEach((word, wordIndex) => {
          if (wordIndex === question.anchorIndex) {
            const anchor = document.createElement("span");
            anchor.className = "sentence-anchor";
            anchor.textContent = word;
            sentencePrompt.appendChild(anchor);
            return;
          }

          const placedWord = findSentenceWordInSlot(question, wordIndex);
          const slot = document.createElement("button");
          slot.type = "button";
          slot.className = "sentence-slot" + (placedWord ? " is-filled" : "") + (sentencePracticeState.selectedWordId && !placedWord ? " is-selected-target" : "");
          slot.textContent = placedWord ? placedWord.word : "_____";
          slot.setAttribute("aria-label", placedWord ? "Placed word " + placedWord.word : "Empty sentence slot");

          slot.addEventListener("click", () => {
            handleSentenceSlotClick(wordIndex);
          });

          slot.addEventListener("dragover", (event) => {
            event.preventDefault();
            slot.classList.add("is-drop-target");
          });

          slot.addEventListener("dragleave", () => {
            slot.classList.remove("is-drop-target");
          });

          slot.addEventListener("drop", (event) => {
            event.preventDefault();
            slot.classList.remove("is-drop-target");

            const wordId = event.dataTransfer.getData("text/plain") || sentencePracticeState.dragWordId;
            if (wordId) {
              placeSentenceWord(wordId, wordIndex);
            }
          });

          if (placedWord) {
            slot.draggable = true;
            slot.addEventListener("dragstart", (event) => {
              sentencePracticeState.dragWordId = placedWord.id;
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", placedWord.id);
              slot.classList.add("is-dragging");
            });

            slot.addEventListener("dragend", () => {
              sentencePracticeState.dragWordId = null;
              slot.classList.remove("is-dragging");
            });
          }

          sentencePrompt.appendChild(slot);
        });

        if (question.terminalPunctuation) {
          const punctuation = document.createElement("span");
          punctuation.className = "sentence-terminal-punctuation";
          punctuation.textContent = question.terminalPunctuation;
          sentencePrompt.appendChild(punctuation);
        }

        sentenceBank.innerHTML = "";
        question.wordItems.filter((item) => item.placedIndex === null).forEach((word) => {
          const wordButton = document.createElement("button");
          wordButton.type = "button";
          wordButton.className = "sentence-bank-word" + (sentencePracticeState.selectedWordId === word.id ? " is-selected" : "");
          wordButton.textContent = word.word;
          wordButton.draggable = true;

          wordButton.addEventListener("click", () => {
            selectSentenceWord(word.id);
          });

          wordButton.addEventListener("dragstart", (event) => {
            sentencePracticeState.dragWordId = word.id;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", word.id);
            wordButton.classList.add("is-dragging");
          });

          wordButton.addEventListener("dragend", () => {
            sentencePracticeState.dragWordId = null;
            wordButton.classList.remove("is-dragging");
          });

          sentenceBank.appendChild(wordButton);
        });
      }

      sentenceBank.addEventListener("dragover", (event) => {
        event.preventDefault();
        sentenceBank.classList.add("is-drop-target");
      });

      sentenceBank.addEventListener("dragleave", () => {
        sentenceBank.classList.remove("is-drop-target");
      });

      sentenceBank.addEventListener("drop", (event) => {
        event.preventDefault();
        sentenceBank.classList.remove("is-drop-target");

        const wordId = event.dataTransfer.getData("text/plain") || sentencePracticeState.dragWordId;
        if (wordId) {
          returnSentenceWordToBank(wordId);
        }
      });

      function captureSentenceResult(reason) {
        const question = getActiveSentenceQuestion();

        if (!question) {
          return;
        }

        const answer = buildSentenceAnswer(question);
        sentencePracticeState.results.push({
          questionNumber: sentencePracticeState.currentIndex + 1,
          answer,
          sentence: question.sentence,
          isCorrect: answer === question.sentence,
          reason
        });
      }

      function finishSentencePractice() {
        clearSentenceTimer();
        sentencePracticeState.sessionActive = false;
        sentencePracticeState.currentIndex = -1;
        sentencePracticeState.selectedWordId = null;
        sentencePracticeState.dragWordId = null;
        sentencePracticeState.remainingSeconds = 0;

        const total = sentencePracticeState.results.length;
        const correct = sentencePracticeState.results.filter((item) => item.isCorrect).length;

        sentenceQuestionStage.hidden = true;
        sentenceResults.hidden = false;
        sentenceNextButton.disabled = true;

        sentenceResultsTitle.textContent = String(correct) + " / " + String(total) + " correct";
        sentenceResultsScore.textContent = "You completed " + String(total) + " sentence" + (total === 1 ? "" : "s") + ". Review the originals below.";
        sentenceResultsList.innerHTML = sentencePracticeState.results.map((result) => `
          <article class="build-result-item ${result.isCorrect ? "is-correct" : "is-wrong"}">
            <div class="build-result-topline">
              <div class="build-result-title">Sentence ${result.questionNumber}</div>
              <div class="build-result-badge" aria-label="${result.isCorrect ? "Correct" : "Incorrect"}">${result.isCorrect ? "&#10003;" : "&#10005;"}</div>
            </div>
            <p class="build-result-answer"><strong>Your build:</strong> ${escapeHtml(result.answer)}</p>
            <p class="build-result-correct"><strong>Correct sentence:</strong> ${escapeHtml(result.sentence)}</p>
          </article>
        `).join("");

        setSentenceStatus(correct === total ? "Excellent round. Every sentence matched the source." : "Round complete. Review the missed sentences and try again.", correct === total ? "success" : "");
        syncSentencePracticeSummary();
      }

      function advanceSentenceQuestion(reason) {
        captureSentenceResult(reason);

        if (sentencePracticeState.currentIndex >= sentencePracticeState.questions.length - 1) {
          finishSentencePractice();
          return;
        }

        loadSentenceQuestion(sentencePracticeState.currentIndex + 1);
      }

      function loadSentenceQuestion(questionIndex) {
        clearSentenceTimer();

        const question = sentencePracticeState.questions[questionIndex];
        if (!question) {
          finishSentencePractice();
          return;
        }

        question.wordItems.forEach((word) => {
          word.placedIndex = null;
        });

        sentencePracticeState.currentIndex = questionIndex;
        sentencePracticeState.selectedWordId = null;
        sentencePracticeState.dragWordId = null;
        sentencePracticeState.remainingSeconds = sentencePracticeState.secondsPerQuestion;
        sentencePracticeState.sessionActive = true;

        sentenceResults.hidden = true;
        sentenceQuestionStage.hidden = false;
        sentenceNextButton.disabled = false;
        setSentenceStatus("", "");
        syncSentencePracticeSummary();
        renderSentenceQuestion();

        sentencePracticeState.timerId = window.setInterval(() => {
          sentencePracticeState.remainingSeconds -= 1;

          if (sentencePracticeState.remainingSeconds <= 0) {
            sentencePracticeState.remainingSeconds = 0;
            syncSentencePracticeSummary();
            setSentenceStatus("Time ran out for that sentence, so the app moved on automatically.", "error");
            advanceSentenceQuestion("timeout");
            return;
          }

          syncSentencePracticeSummary();
        }, 1000);
      }

      function processSentencePaste(pastedText) {
        const sentences = extractSentencePrompts(pastedText);
        updateSentenceQuestionCount(sentences.length);

        if (!sentences.length) {
          sentencePracticeState.preparedSentences = [];
          sentenceStartButton.hidden = true;
          sentenceStartButton.disabled = true;
          sentenceClearPaste.hidden = true;
          sentencePasteSummary.hidden = true;
          setSentencePasteZoneReady(false, 0);
          setSentenceInputMessage("No valid numbered sentences were found in that paste. Use lines like <code>1. Sentence here</code>, <code>2) Sentence here</code>, or <code>3 Sentence here</code>.", "is-danger");
          return;
        }

        sentencePracticeState.preparedSentences = sentences;
        sentencePracticeState.questions = [];
        sentencePracticeState.results = [];
        sentencePracticeState.currentIndex = -1;
        sentencePracticeState.sessionActive = false;
        sentencePracticeState.selectedWordId = null;
        sentencePracticeState.dragWordId = null;
        sentencePracticeState.remainingSeconds = getSentenceSecondsSetting();
        clearSentenceTimer();

        setSentencePasteZoneReady(true, sentences.length);
        sentencePasteSummary.hidden = false;
        sentencePasteSummaryTitle.textContent = String(sentences.length) + " sentence" + (sentences.length === 1 ? "" : "s") + " ready";
        sentencePasteSummaryText.textContent = "The source remains hidden. When you start, the round will mix standard anchor items with last-word-revealed items.";
        sentenceClearPaste.hidden = false;
        sentenceStartButton.hidden = false;
        sentenceStartButton.disabled = false;
        setSentenceInputMessage("Pasted successfully. The sentences were captured without being revealed back to you.");
        setSentenceStatus("", "");
        syncSentencePracticeSummary();
      }

      function startSentencePractice() {
        if (!sentencePracticeState.preparedSentences.length) {
          setSentenceInputMessage("Paste a numbered sentence set first, then start the round.", "is-danger");
          return;
        }

        sentencePracticeState.secondsPerQuestion = getSentenceSecondsSetting();
        sentencePracticeState.questions = buildSentenceQuestions(sentencePracticeState.preparedSentences);
        sentencePracticeState.results = [];
        sentencePracticeState.remainingSeconds = sentencePracticeState.secondsPerQuestion;
        sentenceResultsList.innerHTML = "";
        showSentencePracticeView();
        setSentenceStatus("Practice round started. Correctness will appear after the final sentence.", "success");
        loadSentenceQuestion(0);
      }

      function returnToSentenceIntake() {
        resetSentencePasteState();
        showSentenceIntakeView();
        setSentenceInputMessage("Click the paste area and paste a numbered list like <code>1. Sentence here</code>, <code>2) Sentence here</code>, or <code>3 Sentence here</code>. The pasted text is processed without being shown back to you.");
        sentencePasteZone.focus();
      }

      sentencePasteZone.addEventListener("click", () => {
        sentencePasteZone.focus();
      });

      sentencePasteZone.addEventListener("paste", (event) => {
        event.preventDefault();
        const pastedText = event.clipboardData ? event.clipboardData.getData("text/plain") : "";
        processSentencePaste(pastedText);
      });

      sentenceClearPaste.addEventListener("click", () => {
        resetSentencePasteState();
        setSentenceInputMessage("Set cleared. Paste a new numbered list whenever you are ready.");
        sentencePasteZone.focus();
      });

      sentenceStartButton.addEventListener("click", startSentencePractice);
      sentencePracticeAgain.addEventListener("click", startSentencePractice);
      sentenceNewSet.addEventListener("click", returnToSentenceIntake);

      sentenceNextButton.addEventListener("click", () => {
        if (!sentencePracticeState.sessionActive) {
          return;
        }

        advanceSentenceQuestion("next");
      });

      sentenceTimerSeconds.addEventListener("input", () => {
        if (sentencePracticeState.sessionActive) {
          return;
        }

        const seconds = getSentenceSecondsSetting();
        sentencePracticeState.secondsPerQuestion = seconds;
        sentencePracticeState.remainingSeconds = seconds;
        updateSentenceTimeDisplay();
      });

      // ---------- Reading: complete the words ----------
      const completeWordsIntakeView = document.getElementById("complete-words-intake-view");
      const completeWordsPracticeView = document.getElementById("complete-words-practice-view");
      const completeWordsMinutes = document.getElementById("complete-words-minutes");
      const completeWordsTargetCount = document.getElementById("complete-words-target-count");
      const completeWordsInputNote = document.getElementById("complete-words-input-note");
      const completeWordsPasteZone = document.getElementById("complete-words-paste-zone");
      const completeWordsPasteSummary = document.getElementById("complete-words-paste-summary");
      const completeWordsPasteSummaryTitle = document.getElementById("complete-words-paste-summary-title");
      const completeWordsPasteSummaryText = document.getElementById("complete-words-paste-summary-text");
      const completeWordsClearPaste = document.getElementById("complete-words-clear-paste");
      const completeWordsStartButton = document.getElementById("complete-words-start-button");
      const completeWordsProgressLabel = document.getElementById("complete-words-progress-label");
      const completeWordsTimeLeft = document.getElementById("complete-words-time-left");
      const completeWordsFinishButton = document.getElementById("complete-words-finish-button");
      const completeWordsSessionNote = document.getElementById("complete-words-session-note");
      const completeWordsStage = document.getElementById("complete-words-stage");
      const completeWordsParagraph = document.getElementById("complete-words-paragraph");
      const completeWordsResults = document.getElementById("complete-words-results");
      const completeWordsResultsTitle = document.getElementById("complete-words-results-title");
      const completeWordsResultsScore = document.getElementById("complete-words-results-score");
      const completeWordsReview = document.getElementById("complete-words-review");
      const completeWordsNewSet = document.getElementById("complete-words-new-set");
      const completeWordsPracticeAgain = document.getElementById("complete-words-practice-again");
      const completeWordsStatus = document.getElementById("complete-words-status");

      const COMPLETE_WORDS_GAP_COUNT = 10;
      const COMPLETE_WORDS_PATTERN = /[A-Za-z]{4,}/g;

      const completeWordsState = {
        paragraphSource: "",
        question: null,
        timerId: null,
        remainingSeconds: 120,
        totalSeconds: 120,
        sessionActive: false
      };

      function setCompleteWordsStatus(message, tone) {
        completeWordsStatus.textContent = message || "";
        completeWordsStatus.className = "status-message" + (tone ? " " + tone : "");
      }

      function setCompleteWordsInputMessage(message, tone) {
        completeWordsInputNote.innerHTML = message;
        completeWordsInputNote.className = "countdown-note" + (tone ? " " + tone : "");
      }

      function setCompleteWordsSessionMessage(message, tone) {
        completeWordsSessionNote.textContent = message || "";
        completeWordsSessionNote.className = "countdown-note" + (tone ? " " + tone : "");
      }

      function showCompleteWordsIntakeView() {
        completeWordsIntakeView.hidden = false;
        completeWordsPracticeView.hidden = true;
      }

      function showCompleteWordsPracticeView() {
        completeWordsIntakeView.hidden = true;
        completeWordsPracticeView.hidden = false;
      }

      function clearCompleteWordsTimer() {
        if (completeWordsState.timerId) {
          window.clearInterval(completeWordsState.timerId);
          completeWordsState.timerId = null;
        }
      }

      function getCompleteWordsSecondsSetting() {
        const minutes = Math.max(1, Number(completeWordsMinutes.value) || 2);
        completeWordsMinutes.value = String(minutes);
        return Math.round(minutes * 60);
      }

      function updateCompleteWordsTimeDisplay() {
        completeWordsTimeLeft.textContent = formatTime(completeWordsState.remainingSeconds);
      }

      function getCompleteWordsFilledCount() {
        if (!completeWordsState.question) {
          return 0;
        }

        return completeWordsState.question.targets.filter((target) => target.userValue.length === target.missing.length).length;
      }

      function updateCompleteWordsProgress() {
        completeWordsProgressLabel.textContent = String(getCompleteWordsFilledCount()) + " / " + String(COMPLETE_WORDS_GAP_COUNT);
      }

      function syncCompleteWordsSessionNote() {
        if (!completeWordsState.sessionActive) {
          setCompleteWordsSessionMessage("Your hidden paragraph is ready. Type the missing letters and the cursor will keep moving forward as gaps are completed.");
          return;
        }

        if (completeWordsState.remainingSeconds <= 20) {
          setCompleteWordsSessionMessage("Final 20 seconds. Finish the missing letters or the review will open automatically.", "is-alert");
        } else {
          setCompleteWordsSessionMessage("Fill the missing letters. When a gap is full, focus moves to the next gap.");
        }
      }

      function syncCompleteWordsSummary() {
        updateCompleteWordsTimeDisplay();
        updateCompleteWordsProgress();
        syncCompleteWordsSessionNote();
      }

      function setCompleteWordsPasteZoneReady(isReady) {
        completeWordsPasteZone.classList.toggle("is-ready", isReady);
        completeWordsPasteZone.innerHTML = isReady
          ? `
            <div>
              <strong>Paragraph Captured</strong>
              <p>Your paragraph is stored privately. Paste again here any time if you want to replace it before starting.</p>
            </div>
          `
          : `
            <div>
              <strong>Paste Paragraph</strong>
              <p>Click here, then press <kbd>Ctrl</kbd> + <kbd>V</kbd> or <kbd>Cmd</kbd> + <kbd>V</kbd>. The paragraph is processed privately and never echoed back on screen.</p>
            </div>
          `;
      }

      function extractCompleteWordsParagraph(source) {
        return normalizeWhitespace(
          source
            .replace(/\r\n?/g, "\n")
            .split("\n")
            .map((line) => stripSimpleMarkdown(line))
            .filter(Boolean)
            .join(" ")
        );
      }

      function chooseCompleteWordsTarget(word) {
        const maxMissingLength = Math.min(4, word.length - 1);
        const minMissingLength = Math.min(2, maxMissingLength);
        const missingLength = minMissingLength + Math.floor(Math.random() * (maxMissingLength - minMissingLength + 1));
        const options = [];

        if (word.length - missingLength >= 1) {
          options.push("start");
          options.push("end");
        }

        if (word.length - missingLength >= 2) {
          options.push("middle");
        }

        const mode = options[Math.floor(Math.random() * options.length)];
        let startIndex = 0;

        if (mode === "end") {
          startIndex = word.length - missingLength;
        } else if (mode === "middle") {
          const startMin = 1;
          const startMax = word.length - missingLength - 1;
          startIndex = startMin + Math.floor(Math.random() * (startMax - startMin + 1));
        }

        return {
          prefix: word.slice(0, startIndex),
          missing: word.slice(startIndex, startIndex + missingLength),
          suffix: word.slice(startIndex + missingLength)
        };
      }

      function buildCompleteWordsQuestion(paragraph) {
        const matches = Array.from(paragraph.matchAll(COMPLETE_WORDS_PATTERN)).map((match, matchIndex) => ({
          word: match[0],
          index: match.index,
          wordIndex: matchIndex
        }));

        if (matches.length < COMPLETE_WORDS_GAP_COUNT) {
          return null;
        }

        const selectedIndexes = new Set(
          shuffleArray(matches.map((match) => match.wordIndex)).slice(0, COMPLETE_WORDS_GAP_COUNT)
        );

        const targets = matches
          .filter((match) => selectedIndexes.has(match.wordIndex))
          .map((match, targetIndex) => {
            const target = chooseCompleteWordsTarget(match.word);
            return {
              id: "complete-word-" + targetIndex,
              wordIndex: match.wordIndex,
              index: match.index,
              originalWord: match.word,
              prefix: target.prefix,
              missing: target.missing,
              suffix: target.suffix,
              userValue: ""
            };
          })
          .sort((left, right) => left.index - right.index);

        return {
          paragraph,
          matches,
          targets,
          targetByWordIndex: new Map(targets.map((target) => [target.wordIndex, target]))
        };
      }

      function getCompleteWordsTargetIndex(targetId) {
        if (!completeWordsState.question) {
          return -1;
        }

        return completeWordsState.question.targets.findIndex((target) => target.id === targetId);
      }

      function focusCompleteWordsTarget(targetIndex) {
        const target = completeWordsState.question ? completeWordsState.question.targets[targetIndex] : null;
        if (!target) {
          completeWordsFinishButton.focus();
          return;
        }

        const input = completeWordsParagraph.querySelector('[data-target-id="' + target.id + '"]');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }

      function updateCompleteWordsTargetValue(targetId, nextValue) {
        if (!completeWordsState.question) {
          return;
        }

        const target = completeWordsState.question.targets.find((item) => item.id === targetId);
        if (!target) {
          return;
        }

        target.userValue = nextValue;
        syncCompleteWordsSummary();
      }

      function renderCompleteWordsParagraph() {
        const question = completeWordsState.question;
        if (!question) {
          completeWordsParagraph.innerHTML = "";
          return;
        }

        completeWordsParagraph.innerHTML = "";
        let cursor = 0;

        question.matches.forEach((match) => {
          if (match.index > cursor) {
            completeWordsParagraph.appendChild(document.createTextNode(question.paragraph.slice(cursor, match.index)));
          }

          const target = question.targetByWordIndex.get(match.wordIndex);
          if (!target) {
            completeWordsParagraph.appendChild(document.createTextNode(match.word));
          } else {
            const wrapper = document.createElement("span");
            wrapper.className = "complete-gap";

            if (target.prefix) {
              const prefix = document.createElement("span");
              prefix.className = "complete-gap-part";
              prefix.textContent = target.prefix;
              wrapper.appendChild(prefix);
            }

            const input = document.createElement("input");
            input.type = "text";
            input.className = "complete-gap-input" + (target.userValue.length === target.missing.length ? " is-complete" : "");
            input.value = target.userValue;
            input.maxLength = target.missing.length;
            input.placeholder = "_".repeat(target.missing.length);
            input.setAttribute("aria-label", "Complete missing letters");
            input.setAttribute("data-target-id", target.id);
            input.autocomplete = "off";
            input.spellcheck = false;
            input.style.setProperty("--gap-chars", String(target.missing.length));

            input.addEventListener("input", (event) => {
              const sanitized = event.target.value.replace(/[^A-Za-z]/g, "").slice(0, target.missing.length);
              event.target.value = sanitized;
              updateCompleteWordsTargetValue(target.id, sanitized);
              event.target.classList.toggle("is-complete", sanitized.length === target.missing.length);

              if (sanitized.length === target.missing.length) {
                const nextIndex = getCompleteWordsTargetIndex(target.id) + 1;
                if (nextIndex < question.targets.length) {
                  focusCompleteWordsTarget(nextIndex);
                } else {
                  completeWordsFinishButton.focus();
                }
              }
            });

            input.addEventListener("keydown", (event) => {
              if (event.key === "Backspace" && !event.currentTarget.value) {
                const previousIndex = getCompleteWordsTargetIndex(target.id) - 1;
                if (previousIndex >= 0) {
                  event.preventDefault();
                  focusCompleteWordsTarget(previousIndex);
                }
              }
            });

            wrapper.appendChild(input);

            if (target.suffix) {
              const suffix = document.createElement("span");
              suffix.className = "complete-gap-part";
              suffix.textContent = target.suffix;
              wrapper.appendChild(suffix);
            }

            completeWordsParagraph.appendChild(wrapper);
          }

          cursor = match.index + match.word.length;
        });

        if (cursor < question.paragraph.length) {
          completeWordsParagraph.appendChild(document.createTextNode(question.paragraph.slice(cursor)));
        }
      }

      function renderCompleteWordsReview() {
        const question = completeWordsState.question;
        if (!question) {
          completeWordsReview.innerHTML = "";
          return;
        }

        completeWordsReview.innerHTML = "";
        let cursor = 0;

        question.matches.forEach((match) => {
          if (match.index > cursor) {
            completeWordsReview.appendChild(document.createTextNode(question.paragraph.slice(cursor, match.index)));
          }

          const target = question.targetByWordIndex.get(match.wordIndex);
          if (!target) {
            completeWordsReview.appendChild(document.createTextNode(match.word));
          } else {
            const isCorrect = target.userValue.toLowerCase() === target.missing.toLowerCase();

            if (isCorrect) {
              const correctWord = document.createElement("span");
              correctWord.className = "complete-review-word is-correct";
              correctWord.textContent = target.originalWord;
              completeWordsReview.appendChild(correctWord);
            } else {
              const wrongWord = document.createElement("span");
              wrongWord.className = "complete-review-word is-wrong";

              if (target.prefix) {
                wrongWord.appendChild(document.createTextNode(target.prefix));
              }

              const typed = document.createElement("span");
              typed.className = "complete-review-typed";
              typed.textContent = target.userValue || "_".repeat(target.missing.length);
              wrongWord.appendChild(typed);

              const correction = document.createElement("span");
              correction.className = "complete-review-correct";
              correction.textContent = target.missing;
              wrongWord.appendChild(correction);

              if (target.suffix) {
                wrongWord.appendChild(document.createTextNode(target.suffix));
              }

              completeWordsReview.appendChild(wrongWord);
            }
          }

          cursor = match.index + match.word.length;
        });

        if (cursor < question.paragraph.length) {
          completeWordsReview.appendChild(document.createTextNode(question.paragraph.slice(cursor)));
        }
      }

      function finishCompleteWordsPractice(reason) {
        clearCompleteWordsTimer();
        completeWordsState.sessionActive = false;
        completeWordsStage.hidden = true;
        completeWordsResults.hidden = false;
        completeWordsFinishButton.disabled = true;
        if (reason === "timeout") {
          completeWordsState.remainingSeconds = 0;
        }

        renderCompleteWordsReview();

        const correctCount = completeWordsState.question
          ? completeWordsState.question.targets.filter((target) => target.userValue.toLowerCase() === target.missing.toLowerCase()).length
          : 0;

        completeWordsResultsTitle.textContent = String(correctCount) + " / " + String(COMPLETE_WORDS_GAP_COUNT) + " correct";
        completeWordsResultsScore.textContent = reason === "timeout"
          ? "Time is up. Review the paragraph and the corrected missing parts below."
          : "Paragraph finished. Review the corrected missing parts below.";
        setCompleteWordsStatus(correctCount === COMPLETE_WORDS_GAP_COUNT ? "Excellent round. Every missing part was correct." : "Practice review is ready below.", correctCount === COMPLETE_WORDS_GAP_COUNT ? "success" : "");
        syncCompleteWordsSummary();
      }

      function startCompleteWordsPractice() {
        if (!completeWordsState.paragraphSource) {
          setCompleteWordsInputMessage("Paste a paragraph first, then start the round.", "is-danger");
          return;
        }

        const question = buildCompleteWordsQuestion(completeWordsState.paragraphSource);
        if (!question) {
          setCompleteWordsInputMessage("This paragraph does not have enough eligible words. Please paste a paragraph with at least 10 words that are 4 letters or longer.", "is-danger");
          return;
        }

        completeWordsState.question = question;
        completeWordsState.totalSeconds = getCompleteWordsSecondsSetting();
        completeWordsState.remainingSeconds = completeWordsState.totalSeconds;
        completeWordsState.sessionActive = true;
        showCompleteWordsPracticeView();
        completeWordsStage.hidden = false;
        completeWordsResults.hidden = true;
        completeWordsFinishButton.disabled = false;
        setCompleteWordsStatus("Practice round started. Finish any time or wait for the timer.", "success");
        renderCompleteWordsParagraph();
        syncCompleteWordsSummary();
        focusCompleteWordsTarget(0);

        completeWordsState.timerId = window.setInterval(() => {
          completeWordsState.remainingSeconds -= 1;

          if (completeWordsState.remainingSeconds <= 0) {
            finishCompleteWordsPractice("timeout");
            return;
          }

          syncCompleteWordsSummary();
        }, 1000);
      }

      function resetCompleteWordsState() {
        clearCompleteWordsTimer();
        completeWordsState.paragraphSource = "";
        completeWordsState.question = null;
        completeWordsState.sessionActive = false;
        completeWordsState.totalSeconds = getCompleteWordsSecondsSetting();
        completeWordsState.remainingSeconds = completeWordsState.totalSeconds;
        completeWordsTargetCount.textContent = String(COMPLETE_WORDS_GAP_COUNT);
        setCompleteWordsPasteZoneReady(false);
        completeWordsPasteSummary.hidden = true;
        completeWordsClearPaste.hidden = true;
        completeWordsStartButton.hidden = true;
        completeWordsStartButton.disabled = true;
        completeWordsStage.hidden = false;
        completeWordsResults.hidden = true;
        completeWordsFinishButton.disabled = true;
        completeWordsParagraph.innerHTML = "";
        completeWordsReview.innerHTML = "";
        setCompleteWordsStatus("", "");
        syncCompleteWordsSummary();
      }

      function processCompleteWordsPaste(pastedText) {
        const paragraph = extractCompleteWordsParagraph(pastedText);

        if (!paragraph) {
          resetCompleteWordsState();
          setCompleteWordsInputMessage("No valid paragraph was found in that paste. Please paste one normal paragraph of text.", "is-danger");
          return;
        }

        const previewQuestion = buildCompleteWordsQuestion(paragraph);
        if (!previewQuestion) {
          resetCompleteWordsState();
          setCompleteWordsInputMessage("Please paste a longer paragraph. I need at least 10 words that are 4 letters or longer to create the missing parts.", "is-danger");
          return;
        }

        clearCompleteWordsTimer();
        completeWordsState.paragraphSource = paragraph;
        completeWordsState.question = null;
        completeWordsState.sessionActive = false;
        completeWordsState.totalSeconds = getCompleteWordsSecondsSetting();
        completeWordsState.remainingSeconds = completeWordsState.totalSeconds;
        completeWordsTargetCount.textContent = String(COMPLETE_WORDS_GAP_COUNT);
        setCompleteWordsPasteZoneReady(true);
        completeWordsPasteSummary.hidden = false;
        completeWordsPasteSummaryTitle.textContent = "Paragraph ready";
        completeWordsPasteSummaryText.textContent = "The paragraph is hidden and eligible for 10 missing word parts. Starting will build a fresh set of blanks.";
        completeWordsClearPaste.hidden = false;
        completeWordsStartButton.hidden = false;
        completeWordsStartButton.disabled = false;
        setCompleteWordsInputMessage("Pasted successfully. The paragraph was captured without being shown back to you.");
        setCompleteWordsStatus("", "");
        syncCompleteWordsSummary();
      }

      function returnToCompleteWordsIntake() {
        resetCompleteWordsState();
        showCompleteWordsIntakeView();
        setCompleteWordsInputMessage("Click the paste area and paste one paragraph. The app captures it without showing the paragraph back to you.");
        completeWordsPasteZone.focus();
      }

      completeWordsPasteZone.addEventListener("click", () => {
        completeWordsPasteZone.focus();
      });

      completeWordsPasteZone.addEventListener("paste", (event) => {
        event.preventDefault();
        const pastedText = event.clipboardData ? event.clipboardData.getData("text/plain") : "";
        processCompleteWordsPaste(pastedText);
      });

      completeWordsClearPaste.addEventListener("click", () => {
        resetCompleteWordsState();
        setCompleteWordsInputMessage("Paragraph cleared. Paste a new paragraph whenever you are ready.");
        completeWordsPasteZone.focus();
      });

      completeWordsStartButton.addEventListener("click", startCompleteWordsPractice);
      completeWordsPracticeAgain.addEventListener("click", startCompleteWordsPractice);
      completeWordsNewSet.addEventListener("click", returnToCompleteWordsIntake);

      completeWordsFinishButton.addEventListener("click", () => {
        if (!completeWordsState.sessionActive) {
          return;
        }

        finishCompleteWordsPractice("manual");
      });

      completeWordsMinutes.addEventListener("input", () => {
        if (completeWordsState.sessionActive) {
          return;
        }

        completeWordsState.totalSeconds = getCompleteWordsSecondsSetting();
        completeWordsState.remainingSeconds = completeWordsState.totalSeconds;
        updateCompleteWordsTimeDisplay();
      });

      updateTextCounts();
      resetTimerFromInput();
      resetSentencePasteState();
      showSentenceIntakeView();
      syncSentencePracticeSummary();
      resetCompleteWordsState();
      showCompleteWordsIntakeView();

      // Cleanup object URLs and media streams if the page closes or reloads.
      window.addEventListener("beforeunload", () => {
        clearSentenceTimer();
        clearCompleteWordsTimer();
        clearCurrentMedia();
        clearRecordingAudio();
        stopRecorderStream();
      });
    });
