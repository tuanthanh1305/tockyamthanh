/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {GoogleGenAI} from '@google/genai';
import {marked} from 'marked';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

const MODEL_NAME = 'gemini-2.5-flash';

interface Note {
  id: string;
  rawTranscription: string;
  polishedNote: string;
  timestamp: number;
}

class VoiceNotesApp {
  private genAI: GoogleGenAI;
  private mediaRecorder: MediaRecorder | null = null;
  private recordButton: HTMLButtonElement;
  private recordingStatus: HTMLDivElement;
  private rawTranscription: HTMLDivElement;
  private polishedNote: HTMLDivElement;
  private newButton: HTMLButtonElement;
  private downloadButton: HTMLButtonElement;
  private themeToggleButton: HTMLButtonElement;
  private themeToggleIcon: HTMLElement;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private currentNote: Note | null = null;
  private stream: MediaStream | null = null;
  private editorTitle: HTMLDivElement;
  private hasAttemptedPermission = false;

  private recordingInterface: HTMLDivElement;
  private liveRecordingTitle: HTMLDivElement;
  private liveWaveformCanvas: HTMLCanvasElement | null;
  private liveWaveformCtx: CanvasRenderingContext2D | null = null;
  private liveRecordingTimerDisplay: HTMLDivElement;
  private statusIndicatorDiv: HTMLDivElement | null;

  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private waveformDataArray: Uint8Array | null = null;
  private waveformDrawingId: number | null = null;
  private timerIntervalId: number | null = null;
  private recordingStartTime: number = 0;

  constructor() {
    this.genAI = new GoogleGenAI({
      apiKey: process.env.API_KEY!,
    });

    this.recordButton = document.getElementById(
      'recordButton',
    ) as HTMLButtonElement;
    this.recordingStatus = document.getElementById(
      'recordingStatus',
    ) as HTMLDivElement;
    this.rawTranscription = document.getElementById(
      'rawTranscription',
    ) as HTMLDivElement;
    this.polishedNote = document.getElementById(
      'polishedNote',
    ) as HTMLDivElement;
    this.newButton = document.getElementById('newButton') as HTMLButtonElement;
    this.downloadButton = document.getElementById(
      'downloadButton',
    ) as HTMLButtonElement;
    this.themeToggleButton = document.getElementById(
      'themeToggleButton',
    ) as HTMLButtonElement;
    this.themeToggleIcon = this.themeToggleButton.querySelector(
      'i',
    ) as HTMLElement;
    this.editorTitle = document.querySelector(
      '.editor-title',
    ) as HTMLDivElement;

    this.recordingInterface = document.querySelector(
      '.recording-interface',
    ) as HTMLDivElement;
    this.liveRecordingTitle = document.getElementById(
      'liveRecordingTitle',
    ) as HTMLDivElement;
    this.liveWaveformCanvas = document.getElementById(
      'liveWaveformCanvas',
    ) as HTMLCanvasElement;
    this.liveRecordingTimerDisplay = document.getElementById(
      'liveRecordingTimerDisplay',
    ) as HTMLDivElement;

    if (this.liveWaveformCanvas) {
      this.liveWaveformCtx = this.liveWaveformCanvas.getContext('2d');
    } else {
      console.warn(
        'Live waveform canvas element not found. Visualizer will not work.',
      );
    }

    if (this.recordingInterface) {
      this.statusIndicatorDiv = this.recordingInterface.querySelector(
        '.status-indicator',
      ) as HTMLDivElement;
    } else {
      console.warn('Recording interface element not found.');
      this.statusIndicatorDiv = null;
    }

    this.bindEventListeners();
    this.initTheme();
    this.createNewNote();

    this.recordingStatus.textContent = 'Sẵn sàng ghi âm';
  }

  private bindEventListeners(): void {
    this.recordButton.addEventListener('click', () => this.toggleRecording());
    this.newButton.addEventListener('click', () => this.createNewNote());
    this.downloadButton.addEventListener('click', () => this.downloadAsDocx());
    this.themeToggleButton.addEventListener('click', () => this.toggleTheme());
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    if (
      this.isRecording &&
      this.liveWaveformCanvas &&
      this.liveWaveformCanvas.style.display === 'block'
    ) {
      requestAnimationFrame(() => {
        this.setupCanvasDimensions();
      });
    }
  }

  private setupCanvasDimensions(): void {
    if (!this.liveWaveformCanvas || !this.liveWaveformCtx) return;

    const canvas = this.liveWaveformCanvas;
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    const cssWidth = rect.width;
    const cssHeight = rect.height;

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    this.liveWaveformCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private initTheme(): void {
    const savedTheme = localStorage.getItem('theme');
    // Default is blue theme (no class). Light theme needs 'light-theme' class.
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      this.themeToggleIcon.classList.remove('fa-sun');
      this.themeToggleIcon.classList.add('fa-moon');
    } else {
      document.body.classList.remove('light-theme');
      this.themeToggleIcon.classList.remove('fa-moon');
      this.themeToggleIcon.classList.add('fa-sun');
    }
  }

  private toggleTheme(): void {
    const isLightTheme = document.body.classList.toggle('light-theme');
    if (isLightTheme) {
      // Is now light theme
      localStorage.setItem('theme', 'light');
      this.themeToggleIcon.classList.remove('fa-sun');
      this.themeToggleIcon.classList.add('fa-moon');
    } else {
      // Is now blue theme (default)
      localStorage.setItem('theme', 'blue');
      this.themeToggleIcon.classList.remove('fa-moon');
      this.themeToggleIcon.classList.add('fa-sun');
    }
  }

  private async toggleRecording(): Promise<void> {
    if (!this.isRecording) {
      await this.startRecording();
    } else {
      await this.stopRecording();
    }
  }

  private setupAudioVisualizer(): void {
    if (!this.stream || this.audioContext) return;

    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyserNode = this.audioContext.createAnalyser();

    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.75;

    const bufferLength = this.analyserNode.frequencyBinCount;
    this.waveformDataArray = new Uint8Array(bufferLength);

    source.connect(this.analyserNode);
  }

  private drawLiveWaveform(): void {
    if (
      !this.analyserNode ||
      !this.waveformDataArray ||
      !this.liveWaveformCtx ||
      !this.liveWaveformCanvas ||
      !this.isRecording
    ) {
      if (this.waveformDrawingId) cancelAnimationFrame(this.waveformDrawingId);
      this.waveformDrawingId = null;
      return;
    }

    this.waveformDrawingId = requestAnimationFrame(() =>
      this.drawLiveWaveform(),
    );
    this.analyserNode.getByteFrequencyData(this.waveformDataArray);

    const ctx = this.liveWaveformCtx;
    const canvas = this.liveWaveformCanvas;

    const logicalWidth = canvas.clientWidth;
    const logicalHeight = canvas.clientHeight;

    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    const bufferLength = this.analyserNode.frequencyBinCount;
    const numBars = Math.floor(bufferLength * 0.5);

    if (numBars === 0) return;

    const totalBarPlusSpacingWidth = logicalWidth / numBars;
    const barWidth = Math.max(1, Math.floor(totalBarPlusSpacingWidth * 0.7));
    const barSpacing = Math.max(0, Math.floor(totalBarPlusSpacingWidth * 0.3));

    let x = 0;

    const recordingColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-recording')
        .trim() || '#ff3b30';
    ctx.fillStyle = recordingColor;

    for (let i = 0; i < numBars; i++) {
      if (x >= logicalWidth) break;

      const dataIndex = Math.floor(i * (bufferLength / numBars));
      const barHeightNormalized = this.waveformDataArray[dataIndex] / 255.0;
      let barHeight = barHeightNormalized * logicalHeight;

      if (barHeight < 1 && barHeight > 0) barHeight = 1;
      barHeight = Math.round(barHeight);

      const y = Math.round((logicalHeight - barHeight) / 2);

      ctx.fillRect(Math.floor(x), y, barWidth, barHeight);
      x += barWidth + barSpacing;
    }
  }

  private updateLiveTimer(): void {
    if (!this.isRecording || !this.liveRecordingTimerDisplay) return;
    const now = Date.now();
    const elapsedMs = now - this.recordingStartTime;

    const totalSeconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const hundredths = Math.floor((elapsedMs % 1000) / 10);

    this.liveRecordingTimerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
  }

  private startLiveDisplay(): void {
    if (
      !this.recordingInterface ||
      !this.liveRecordingTitle ||
      !this.liveWaveformCanvas ||
      !this.liveRecordingTimerDisplay
    ) {
      console.warn(
        'One or more live display elements are missing. Cannot start live display.',
      );
      return;
    }

    this.recordingInterface.classList.add('is-live');
    this.liveRecordingTitle.style.display = 'block';
    this.liveWaveformCanvas.style.display = 'block';
    this.liveRecordingTimerDisplay.style.display = 'block';

    this.setupCanvasDimensions();

    if (this.statusIndicatorDiv) this.statusIndicatorDiv.style.display = 'none';

    const iconElement = this.recordButton.querySelector(
      '.record-button-inner i',
    ) as HTMLElement;
    if (iconElement) {
      iconElement.classList.remove('fa-microphone');
      iconElement.classList.add('fa-stop');
    }

    const currentTitle = this.editorTitle.textContent?.trim();
    const placeholder =
      this.editorTitle.getAttribute('placeholder') || 'Ghi chú không tiêu đề';
    this.liveRecordingTitle.textContent =
      currentTitle && currentTitle !== placeholder
        ? currentTitle
        : 'Bản ghi mới';

    this.setupAudioVisualizer();
    this.drawLiveWaveform();

    this.recordingStartTime = Date.now();
    this.updateLiveTimer();
    if (this.timerIntervalId) clearInterval(this.timerIntervalId);
    this.timerIntervalId = window.setInterval(() => this.updateLiveTimer(), 50);
  }

  private stopLiveDisplay(): void {
    if (
      !this.recordingInterface ||
      !this.liveRecordingTitle ||
      !this.liveWaveformCanvas ||
      !this.liveRecordingTimerDisplay
    ) {
      if (this.recordingInterface)
        this.recordingInterface.classList.remove('is-live');
      return;
    }
    this.recordingInterface.classList.remove('is-live');
    this.liveRecordingTitle.style.display = 'none';
    this.liveWaveformCanvas.style.display = 'none';
    this.liveRecordingTimerDisplay.style.display = 'none';

    if (this.statusIndicatorDiv)
      this.statusIndicatorDiv.style.display = 'block';

    const iconElement = this.recordButton.querySelector(
      '.record-button-inner i',
    ) as HTMLElement;
    if (iconElement) {
      iconElement.classList.remove('fa-stop');
      iconElement.classList.add('fa-microphone');
    }

    if (this.waveformDrawingId) {
      cancelAnimationFrame(this.waveformDrawingId);
      this.waveformDrawingId = null;
    }
    if (this.timerIntervalId) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }
    if (this.liveWaveformCtx && this.liveWaveformCanvas) {
      this.liveWaveformCtx.clearRect(
        0,
        0,
        this.liveWaveformCanvas.width,
        this.liveWaveformCanvas.height,
      );
    }

    if (this.audioContext) {
      if (this.audioContext.state !== 'closed') {
        this.audioContext
          .close()
          .catch((e) => console.warn('Error closing audio context', e));
      }
      this.audioContext = null;
    }
    this.analyserNode = null;
    this.waveformDataArray = null;
  }

  private async startRecording(): Promise<void> {
    try {
      this.audioChunks = [];
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
        await this.audioContext.close();
        this.audioContext = null;
      }

      this.recordingStatus.textContent = 'Đang yêu cầu quyền truy cập micro...';

      try {
        this.stream = await navigator.mediaDevices.getUserMedia({audio: true});
      } catch (err) {
        console.error('Lỗi với ràng buộc cơ bản:', err);
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
      }

      try {
        this.mediaRecorder = new MediaRecorder(this.stream, {
          mimeType: 'audio/webm',
        });
      } catch (e) {
        console.error('audio/webm không được hỗ trợ, thử mặc định:', e);
        this.mediaRecorder = new MediaRecorder(this.stream);
      }

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0)
          this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        this.stopLiveDisplay();

        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, {
            type: this.mediaRecorder?.mimeType || 'audio/webm',
          });
          this.processAudio(audioBlob).catch((err) => {
            console.error('Lỗi xử lý âm thanh:', err);
            this.recordingStatus.textContent = 'Lỗi xử lý bản ghi';
          });
        } else {
          this.recordingStatus.textContent =
            'Không có dữ liệu âm thanh nào được ghi lại. Vui lòng thử lại.';
        }

        if (this.stream) {
          this.stream.getTracks().forEach((track) => {
            track.stop();
          });
          this.stream = null;
        }
      };

      this.mediaRecorder.start();
      this.isRecording = true;

      this.recordButton.classList.add('recording');
      this.recordButton.setAttribute('title', 'Dừng Ghi âm');

      this.startLiveDisplay();
    } catch (error) {
      console.error('Lỗi khi bắt đầu ghi âm:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';

      if (
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError'
      ) {
        this.recordingStatus.textContent =
          'Quyền truy cập micro đã bị từ chối. Vui lòng kiểm tra cài đặt trình duyệt và tải lại trang.';
      } else if (
        errorName === 'NotFoundError' ||
        (errorName === 'DOMException' &&
          errorMessage.includes('Requested device not found'))
      ) {
        this.recordingStatus.textContent =
          'Không tìm thấy micro. Vui lòng kết nối một micro.';
      } else if (
        errorName === 'NotReadableError' ||
        errorName === 'AbortError' ||
        (errorName === 'DOMException' &&
          errorMessage.includes('Failed to allocate audiosource'))
      ) {
        this.recordingStatus.textContent =
          'Không thể truy cập micro. Thiết bị có thể đang được sử dụng bởi một ứng dụng khác.';
      } else {
        this.recordingStatus.textContent = `Lỗi: ${errorMessage}`;
      }

      this.isRecording = false;
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      this.recordButton.classList.remove('recording');
      this.recordButton.setAttribute('title', 'Bắt đầu Ghi âm');
      this.stopLiveDisplay();
    }
  }

  private async stopRecording(): Promise<void> {
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.error('Lỗi khi dừng MediaRecorder:', e);
        this.stopLiveDisplay();
      }

      this.isRecording = false;

      this.recordButton.classList.remove('recording');
      this.recordButton.setAttribute('title', 'Bắt đầu Ghi âm');
      this.recordingStatus.textContent = 'Đang xử lý âm thanh...';
    } else {
      if (!this.isRecording) this.stopLiveDisplay();
    }
  }

  private async processAudio(audioBlob: Blob): Promise<void> {
    if (audioBlob.size === 0) {
      this.recordingStatus.textContent =
        'Không có dữ liệu âm thanh nào được ghi lại. Vui lòng thử lại.';
      return;
    }

    try {
      URL.createObjectURL(audioBlob);

      this.recordingStatus.textContent = 'Đang chuyển đổi âm thanh...';

      const reader = new FileReader();
      const readResult = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            const base64Audio = reader.result.split(',')[1];
            resolve(base64Audio);
          } else {
            reject(new Error('Could not read audio file.'));
          }
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await readResult;

      if (!base64Audio) throw new Error('Không thể chuyển đổi âm thanh sang base64');

      const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
      await this.getTranscription(base64Audio, mimeType);
    } catch (error) {
      console.error('Lỗi trong processAudio:', error);
      this.recordingStatus.textContent =
        'Lỗi xử lý bản ghi. Vui lòng thử lại.';
    }
  }

  private async getTranscription(
    base64Audio: string,
    mimeType: string,
  ): Promise<void> {
    try {
      this.recordingStatus.textContent = 'Đang lấy bản ghi âm thô...';

      const contents = [
        {text: 'Tạo một bản ghi âm chi tiết, từng từ một cho âm thanh này. Vui lòng bao gồm dấu thời gian ở định dạng [HH:MM:SS] ở đầu các câu hoặc cụm từ quan trọng để chỉ ra thời gian của chúng trong âm thanh.'},
        {inlineData: {mimeType: mimeType, data: base64Audio}},
      ];

      const response = await this.genAI.models.generateContent({
        model: MODEL_NAME,
        contents: { parts: contents },
      });

      const transcriptionText = response.text;

      if (transcriptionText) {
        this.rawTranscription.textContent = transcriptionText;
        if (transcriptionText.trim() !== '') {
          this.rawTranscription.classList.remove('placeholder-active');
        } else {
          const placeholder =
            this.rawTranscription.getAttribute('placeholder') || '';
          this.rawTranscription.textContent = placeholder;
          this.rawTranscription.classList.add('placeholder-active');
        }

        if (this.currentNote)
          this.currentNote.rawTranscription = transcriptionText;
        this.recordingStatus.textContent =
          'Ghi âm thô hoàn tất. Đang tinh chỉnh ghi chú...';
        this.getPolishedNote().catch((err) => {
          console.error('Lỗi khi tinh chỉnh ghi chú:', err);
          this.recordingStatus.textContent =
            'Lỗi tinh chỉnh ghi chú sau khi có bản ghi âm thô.';
        });
      } else {
        this.recordingStatus.textContent =
          'Ghi âm thô thất bại hoặc trả về trống.';
        this.polishedNote.innerHTML =
          '<p><em>Không thể chuyển lời nói thành văn bản. Vui lòng thử lại.</em></p>';
        this.rawTranscription.textContent =
          this.rawTranscription.getAttribute('placeholder');
        this.rawTranscription.classList.add('placeholder-active');
      }
    } catch (error) {
      console.error('Lỗi khi lấy bản ghi âm thô:', error);
      this.recordingStatus.textContent =
        'Lỗi khi lấy bản ghi âm thô. Vui lòng thử lại.';
      this.polishedNote.innerHTML = `<p><em>Lỗi trong quá trình chuyển lời nói thành văn bản: ${error instanceof Error ? error.message : String(error)}</em></p>`;
      this.rawTranscription.textContent =
        this.rawTranscription.getAttribute('placeholder');
      this.rawTranscription.classList.add('placeholder-active');
    }
  }

  private async getPolishedNote(): Promise<void> {
    try {
      if (
        !this.rawTranscription.textContent ||
        this.rawTranscription.textContent.trim() === '' ||
        this.rawTranscription.classList.contains('placeholder-active')
      ) {
        this.recordingStatus.textContent = 'Không có bản ghi âm thô để tinh chỉnh';
        this.polishedNote.innerHTML =
          '<p><em>Không có bản ghi âm thô để tinh chỉnh.</em></p>';
        const placeholder = this.polishedNote.getAttribute('placeholder') || '';
        this.polishedNote.innerHTML = placeholder;
        this.polishedNote.classList.add('placeholder-active');
        return;
      }

      this.recordingStatus.textContent = 'Đang tinh chỉnh ghi chú...';

      const prompt = `Dựa vào bản ghi âm thô dưới đây (có thể bằng tiếng Anh hoặc ngôn ngữ khác), hãy thực hiện các công việc sau:
1. Dịch toàn bộ nội dung sang Tiếng Việt một cách chính xác.
2. Chỉnh sửa văn bản Tiếng Việt đã dịch để tạo thành một ghi chú rõ ràng, có định dạng đẹp.
3. Loại bỏ các từ đệm (ví dụ: "um", "uh"), các đoạn lặp từ, những câu nói sai hoặc ngập ngừng, và các dấu thời gian (ví dụ: [00:01:23]), nhưng phải giữ lại ý nghĩa gốc.
4. Định dạng ghi chú Tiếng Việt cuối cùng bằng markdown (sử dụng tiêu đề, danh sách, in đậm, v.v.) để dễ đọc.
5. Đảm bảo kết quả cuối cùng CHỈ LÀ ghi chú Tiếng Việt đã được tinh chỉnh, không có bất kỳ bình luận hay giải thích nào thêm.

Bản ghi âm thô:
${this.rawTranscription.textContent}`;
      const contents = [{text: prompt}];

      const response = await this.genAI.models.generateContent({
        model: MODEL_NAME,
        contents: { parts: contents },
      });
      const polishedText = response.text;

      if (polishedText) {
        if (this.currentNote) this.currentNote.polishedNote = polishedText;
        const htmlContent = await marked.parse(polishedText);
        this.polishedNote.innerHTML = htmlContent;

        if (polishedText.trim() !== '') {
          this.polishedNote.classList.remove('placeholder-active');
        } else {
          const placeholder =
            this.polishedNote.getAttribute('placeholder') || '';
          this.polishedNote.innerHTML = placeholder;
          this.polishedNote.classList.add('placeholder-active');
        }

        let noteTitleSet = false;
        const lines = polishedText.split('\n').map((l) => l.trim());

        for (const line of lines) {
          if (line.startsWith('#')) {
            const title = line.replace(/^#+\s+/, '').trim();
            if (this.editorTitle && title) {
              this.editorTitle.textContent = title;
              this.editorTitle.classList.remove('placeholder-active');
              noteTitleSet = true;
              break;
            }
          }
        }

        if (!noteTitleSet && this.editorTitle) {
          for (const line of lines) {
            if (line.length > 0) {
              let potentialTitle = line.replace(
                /^[\*_\`#\->\s\[\]\(.\d)]+/,
                '',
              );
              potentialTitle = potentialTitle.replace(/[\*_\`#]+$/, '');
              potentialTitle = potentialTitle.trim();

              if (potentialTitle.length > 3) {
                const maxLength = 60;
                this.editorTitle.textContent =
                  potentialTitle.substring(0, maxLength) +
                  (potentialTitle.length > maxLength ? '...' : '');
                this.editorTitle.classList.remove('placeholder-active');
                noteTitleSet = true;
                break;
              }
            }
          }
        }

        if (!noteTitleSet && this.editorTitle) {
          const currentEditorText = this.editorTitle.textContent?.trim();
          const placeholderText =
            this.editorTitle.getAttribute('placeholder') || 'Ghi chú không tiêu đề';
          if (
            currentEditorText === '' ||
            currentEditorText === placeholderText
          ) {
            this.editorTitle.textContent = placeholderText;
            if (!this.editorTitle.classList.contains('placeholder-active')) {
              this.editorTitle.classList.add('placeholder-active');
            }
          }
        }

        this.recordingStatus.textContent =
          'Ghi chú đã được tinh chỉnh. Sẵn sàng cho bản ghi tiếp theo.';
      } else {
        this.recordingStatus.textContent =
          'Tinh chỉnh thất bại hoặc trả về trống.';
        this.polishedNote.innerHTML =
          '<p><em>Kết quả tinh chỉnh trống. Bản ghi âm thô vẫn có sẵn.</em></p>';
        if (
          this.polishedNote.textContent?.trim() === '' ||
          this.polishedNote.innerHTML.includes('<em>Kết quả tinh chỉnh trống')
        ) {
          const placeholder =
            this.polishedNote.getAttribute('placeholder') || '';
          this.polishedNote.innerHTML = placeholder;
          this.polishedNote.classList.add('placeholder-active');
        }
      }
    } catch (error) {
      console.error('Lỗi khi tinh chỉnh ghi chú:', error);
      this.recordingStatus.textContent =
        'Lỗi khi tinh chỉnh ghi chú. Vui lòng thử lại.';
      this.polishedNote.innerHTML = `<p><em>Lỗi trong quá trình tinh chỉnh: ${error instanceof Error ? error.message : String(error)}</em></p>`;
      if (
        this.polishedNote.textContent?.trim() === '' ||
        this.polishedNote.innerHTML.includes('<em>Lỗi trong quá trình tinh chỉnh')
      ) {
        const placeholder = this.polishedNote.getAttribute('placeholder') || '';
        this.polishedNote.innerHTML = placeholder;
        this.polishedNote.classList.add('placeholder-active');
      }
    }
  }

  private createRunsFromLine(line: string): any[] {
    const runs: any[] = [];
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*)/g).filter((p) => p);

    for (const part of parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        runs.push(new TextRun({text: part.slice(2, -2), bold: true}));
      } else if (part.startsWith('*') && part.endsWith('*')) {
        runs.push(new TextRun({text: part.slice(1, -1), italics: true}));
      } else {
        runs.push(new TextRun(part));
      }
    }
    return runs;
  }

  private async downloadAsDocx(): Promise<void> {
    const activeTabButton = document.querySelector('.tab-button.active') as HTMLButtonElement;
    if (!activeTabButton) {
      alert('Không thể xác định tab đang hoạt động.');
      return;
    }
    
    const activeTab = activeTabButton.dataset.tab;
    let contentToDownload = '';
    let isMarkdown = false;

    if (activeTab === 'note') {
      contentToDownload = this.currentNote?.polishedNote ?? '';
      isMarkdown = true;
    } else if (activeTab === 'raw') {
      contentToDownload = this.currentNote?.rawTranscription ?? '';
      isMarkdown = false;
    }

    if (!this.currentNote || !contentToDownload || contentToDownload.trim() === '') {
      alert('Không có nội dung để tải xuống trong tab này. Vui lòng ghi âm hoặc chọn tab khác.');
      return;
    }

    try {
      const docChildren: Paragraph[] = [];

      if (isMarkdown) {
        const lines = contentToDownload.split('\n');
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine === '') {
            docChildren.push(new Paragraph({text: ''}));
            continue;
          }

          if (trimmedLine.startsWith('# ')) {
            docChildren.push(
              new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: this.createRunsFromLine(trimmedLine.substring(2)),
              }),
            );
          } else if (trimmedLine.startsWith('## ')) {
            docChildren.push(
              new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: this.createRunsFromLine(trimmedLine.substring(3)),
              }),
            );
          } else if (trimmedLine.startsWith('### ')) {
            docChildren.push(
              new Paragraph({
                heading: HeadingLevel.HEADING_3,
                children: this.createRunsFromLine(trimmedLine.substring(4)),
              }),
            );
          } else if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
            docChildren.push(
              new Paragraph({
                bullet: {level: 0},
                children: this.createRunsFromLine(trimmedLine.substring(2)),
              }),
            );
          } else if (trimmedLine.match(/^\d+\.\s/)) {
            docChildren.push(
              new Paragraph({
                bullet: {level: 0}, // Numbering is not directly supported in the same way, using bullets.
                children: this.createRunsFromLine(
                  trimmedLine.replace(/^\d+\.\s/, ''),
                ),
              }),
            );
          } else {
            docChildren.push(
              new Paragraph({children: this.createRunsFromLine(trimmedLine)}),
            );
          }
        }
      } else {
        // Handle plain text from raw transcription
        const lines = contentToDownload.split('\n');
        for (const line of lines) {
            docChildren.push(new Paragraph({ children: [new TextRun(line)] }));
        }
      }

      if (docChildren.length === 0) {
        alert('Nội dung trống, không thể tạo file.');
        return;
      }

      const doc = new Document({
        sections: [{children: docChildren}],
      });

      const blob = await Packer.toBlob(doc);

      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);

      let title = this.editorTitle.textContent?.trim() || 'Ghi chú';
      const placeholderTitle = this.editorTitle.getAttribute('placeholder');
      if (title === placeholderTitle || !title) {
        title = 'Ghi-chú-không-tiêu-đề';
      }

      link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Không thể tạo file DOCX:', error);
      alert('Đã xảy ra lỗi khi tạo file .docx. Vui lòng thử lại.');
    }
  }

  private createNewNote(): void {
    this.currentNote = {
      id: `note_${Date.now()}`,
      rawTranscription: '',
      polishedNote: '',
      timestamp: Date.now(),
    };

    const rawPlaceholder =
      this.rawTranscription.getAttribute('placeholder') || '';
    this.rawTranscription.textContent = rawPlaceholder;
    this.rawTranscription.classList.add('placeholder-active');

    const polishedPlaceholder =
      this.polishedNote.getAttribute('placeholder') || '';
    this.polishedNote.innerHTML = polishedPlaceholder;
    this.polishedNote.classList.add('placeholder-active');

    if (this.editorTitle) {
      const placeholder =
        this.editorTitle.getAttribute('placeholder') || 'Ghi chú không tiêu đề';
      this.editorTitle.textContent = placeholder;
      this.editorTitle.classList.add('placeholder-active');
    }
    this.recordingStatus.textContent = 'Sẵn sàng ghi âm';

    if (this.isRecording) {
      this.mediaRecorder?.stop();
      this.isRecording = false;
      this.recordButton.classList.remove('recording');
    } else {
      this.stopLiveDisplay();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new VoiceNotesApp();

  document
    .querySelectorAll<HTMLElement>('[contenteditable][placeholder]')
    .forEach((el) => {
      const placeholder = el.getAttribute('placeholder')!;

      function updatePlaceholderState() {
        const currentText = (
          el.id === 'polishedNote' ? el.innerText : el.textContent
        )?.trim();

        if (currentText === '' || currentText === placeholder) {
          if (el.id === 'polishedNote' && currentText === '') {
            el.innerHTML = placeholder;
          } else if (currentText === '') {
            el.textContent = placeholder;
          }
          el.classList.add('placeholder-active');
        } else {
          el.classList.remove('placeholder-active');
        }
      }

      updatePlaceholderState();

      el.addEventListener('focus', function () {
        const currentText = (
          this.id === 'polishedNote' ? this.innerText : this.textContent
        )?.trim();
        if (currentText === placeholder) {
          if (this.id === 'polishedNote') this.innerHTML = '';
          else this.textContent = '';
          this.classList.remove('placeholder-active');
        }
      });

      el.addEventListener('blur', function () {
        updatePlaceholderState();
      });
    });
});

export {};
