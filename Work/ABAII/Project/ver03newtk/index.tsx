/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {GoogleGenAI, GenerateContentResponse} from '@google/genai';
import {marked} from 'marked';
import * as docx from 'docx';
import JSZip from 'jszip';

const MODEL_NAME = 'gemini-2.5-flash';

interface Note {
  id: string;
  title: string;
  rawTranscription: string;
  polishedNote: string;
  timestamp: number;
  audioData?: string;
  audioMimeType?: string;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

class VoiceNotesApp {
  private genAI: GoogleGenAI;
  private mediaRecorder: MediaRecorder | null = null;
  private recordButton: HTMLButtonElement;
  private recordingStatus: HTMLDivElement;
  private rawTranscription: HTMLDivElement;
  private polishedNote: HTMLDivElement;
  private newButton: HTMLButtonElement;
  private themeToggleButton: HTMLButtonElement;
  private downloadButton: HTMLButtonElement;
  private historyButton: HTMLButtonElement;
  private closeHistoryButton: HTMLButtonElement;
  private historySidebar: HTMLDivElement;
  private historyList: HTMLUListElement;
  private overlay: HTMLDivElement;
  private themeToggleIcon: HTMLElement;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private currentNote: Note | null = null;
  private notesHistory: Note[] = [];
  private stream: MediaStream | null = null;
  private editorTitle: HTMLDivElement;
  private hasAttemptedPermission = false;

  private mainContent: HTMLDivElement;
  private recordingInterface: HTMLDivElement;
  private liveRecordingTitle: HTMLDivElement;
  private liveWaveformCanvas: HTMLCanvasElement | null;
  private liveWaveformCtx: CanvasRenderingContext2D | null = null;
  private liveRecordingTimerDisplay: HTMLDivElement;
  private statusIndicatorDiv: HTMLDivElement | null;
  
  private audioPlayerContainer: HTMLDivElement;
  private historyAudioPlayer: HTMLAudioElement;

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
    this.themeToggleButton = document.getElementById(
      'themeToggleButton',
    ) as HTMLButtonElement;
    this.downloadButton = document.getElementById(
      'downloadButton',
    ) as HTMLButtonElement;
    this.historyButton = document.getElementById('historyButton') as HTMLButtonElement;
    this.closeHistoryButton = document.getElementById('closeHistoryButton') as HTMLButtonElement;
    this.historySidebar = document.getElementById('historySidebar') as HTMLDivElement;
    this.historyList = document.getElementById('historyList') as HTMLUListElement;
    this.overlay = document.getElementById('overlay') as HTMLDivElement;

    this.themeToggleIcon = this.themeToggleButton.querySelector(
      'i',
    ) as HTMLElement;
    this.editorTitle = document.querySelector(
      '.editor-title',
    ) as HTMLDivElement;
      
    this.mainContent = document.querySelector('.main-content') as HTMLDivElement;

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
    
    this.audioPlayerContainer = document.getElementById('audioPlayerContainer') as HTMLDivElement;
    this.historyAudioPlayer = document.getElementById('historyAudioPlayer') as HTMLAudioElement;

    if (this.liveWaveformCanvas) {
      this.liveWaveformCtx = this.liveWaveformCanvas.getContext('2d');
    } else {
      console.warn(
        'Không tìm thấy phần tử canvas cho dạng sóng trực tiếp. Trình hiển thị sẽ không hoạt động.',
      );
    }

    if (this.recordingInterface) {
      this.statusIndicatorDiv = this.recordingInterface.querySelector(
        '.status-indicator',
      ) as HTMLDivElement;
    } else {
      console.warn('Không tìm thấy phần tử giao diện ghi âm.');
      this.statusIndicatorDiv = null;
    }

    this.bindEventListeners();
    this.initTheme();
    this.loadHistory();
    if (this.notesHistory.length === 0) {
      this.createNewNote();
    } else {
      this.loadNoteIntoEditor(this.notesHistory[0]);
    }
    

    this.recordingStatus.textContent = 'Sẵn sàng ghi âm';
  }

  private bindEventListeners(): void {
    this.recordButton.addEventListener('click', () => this.toggleRecording());
    this.newButton.addEventListener('click', () => this.createNewNote());
    this.themeToggleButton.addEventListener('click', () => this.toggleTheme());
    this.downloadButton.addEventListener('click', () => this.downloadAsDocx());
    this.historyButton.addEventListener('click', () => this.toggleHistory(true));
    this.closeHistoryButton.addEventListener('click', () => this.toggleHistory(false));
    this.overlay.addEventListener('click', () => this.toggleHistory(false));
    this.historyList.addEventListener('click', (e) => this.handleHistoryClick(e));
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  private handleHistoryClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const item = target.closest<HTMLLIElement>('.history-item');

    if (!item) return;

    const noteId = item.dataset.noteId;
    if (!noteId) return;

    if (target.closest('.delete-history-item')) {
      this.deleteNoteFromHistory(noteId);
    } else {
      const noteToLoad = this.notesHistory.find(n => n.id === noteId);
      if (noteToLoad) {
        this.loadNoteIntoEditor(noteToLoad);
        this.toggleHistory(false);
      }
    }
  }

  private loadNoteIntoEditor(note: Note): void {
    this.saveCurrentNoteToHistory();
    this.currentNote = note;

    this.editorTitle.textContent = note.title;
    this.editorTitle.classList.toggle('placeholder-active', !note.title || note.title === this.editorTitle.getAttribute('placeholder'));

    this.rawTranscription.textContent = note.rawTranscription;
    this.rawTranscription.classList.toggle('placeholder-active', !note.rawTranscription);
    if (!note.rawTranscription) {
        this.rawTranscription.textContent = this.rawTranscription.getAttribute('placeholder');
        this.rawTranscription.classList.add('placeholder-active');
    }

    if (note.audioData && note.audioMimeType) {
        this.historyAudioPlayer.src = `data:${note.audioMimeType};base64,${note.audioData}`;
        this.audioPlayerContainer.classList.remove('hidden');
    } else {
        this.audioPlayerContainer.classList.add('hidden');
        this.historyAudioPlayer.src = '';
    }

    this.updatePolishedNoteUI(note.polishedNote, true);
  }
  
  private deleteNoteFromHistory(noteId: string): void {
    this.notesHistory = this.notesHistory.filter(note => note.id !== noteId);
    this.saveHistory();
    this.renderHistoryList();

    if (this.currentNote?.id === noteId) {
        this.createNewNote();
    }

    if(this.notesHistory.length === 0) {
        this.toggleHistory(false);
    }
  }

  private toggleHistory(force?: boolean): void {
    const isOpen = this.historySidebar.classList.contains('is-open');
    const show = force === undefined ? !isOpen : force;

    this.historySidebar.classList.toggle('is-open', show);
    this.overlay.classList.toggle('is-visible', show);
  }

  private loadHistory(): void {
    const savedHistory = localStorage.getItem('voice-notes-history');
    if (savedHistory) {
      try {
        this.notesHistory = JSON.parse(savedHistory);
      } catch (e) {
        console.error("Lỗi phân tích lịch sử:", e);
        this.notesHistory = [];
      }
    }
    this.renderHistoryList();
  }

  private saveHistory(): void {
    localStorage.setItem('voice-notes-history', JSON.stringify(this.notesHistory));
  }
  
  private renderHistoryList(): void {
    this.historyList.innerHTML = '';
    if (this.notesHistory.length === 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.textContent = 'Chưa có lịch sử.';
        emptyMessage.className = 'history-empty-message';
        this.historyList.appendChild(emptyMessage);
        return;
    }

    this.notesHistory.forEach(note => {
        const item = document.createElement('li');
        item.className = 'history-item';
        item.dataset.noteId = note.id;

        const date = new Date(note.timestamp).toLocaleDateString('vi-VN', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        
        const audioIcon = note.audioData ? '<i class="fas fa-headphones-alt history-audio-icon" title="Có kèm bản ghi âm"></i>' : '';

        item.innerHTML = `
            <div class="history-item-content">
                <div class="history-item-top-line">
                  ${audioIcon}
                  <strong class="history-item-title">${note.title || 'Ghi chép không có tiêu đề'}</strong>
                </div>
                <span class="history-item-date">${date}</span>
            </div>
            <button class="delete-history-item" title="Xóa mục này">
                <i class="fas fa-trash"></i>
            </button>
        `;
        this.historyList.appendChild(item);
    });
  }

  private saveCurrentNoteToHistory(): void {
    if (!this.currentNote) return;

    const polishedContent = this.polishedNote.innerText?.trim();
    const rawContent = this.rawTranscription.textContent?.trim();
    const title = (this.editorTitle.textContent || 'Ghi chép không có tiêu đề').trim();

    const polishedPlaceholder = this.polishedNote.getAttribute('placeholder') || '';
    const rawPlaceholder = this.rawTranscription.getAttribute('placeholder') || '';
    const titlePlaceholder = this.editorTitle.getAttribute('placeholder') || '';

    // Do not save if both fields are empty or just placeholders
    if ((!polishedContent || polishedContent === polishedPlaceholder) && 
        (!rawContent || rawContent === rawPlaceholder)) {
      
      // If the note exists in history, check if its content has been cleared.
      const existingNoteIndex = this.notesHistory.findIndex(note => note.id === this.currentNote!.id);
      if(existingNoteIndex > -1) {
        // If content is cleared, remove it from history
         this.notesHistory.splice(existingNoteIndex, 1);
         this.saveHistory();
         this.renderHistoryList();
      }
      return;
    }

    this.currentNote.title = title === titlePlaceholder ? 'Ghi chép không có tiêu đề' : title;
    // Important: Use the raw markdown content for polishedNote, not the innerText
    this.currentNote.polishedNote = this.polishedNote.classList.contains('placeholder-active') ? '' : this.currentNote.polishedNote;
    this.currentNote.rawTranscription = (rawContent === rawPlaceholder || !rawContent) ? '' : rawContent;
    this.currentNote.timestamp = Date.now();

    const existingNoteIndex = this.notesHistory.findIndex(note => note.id === this.currentNote!.id);

    if (existingNoteIndex > -1) {
      this.notesHistory[existingNoteIndex] = { ...this.currentNote };
    } else {
      this.notesHistory.unshift({ ...this.currentNote });
    }

    this.notesHistory.sort((a, b) => b.timestamp - a.timestamp);

    this.saveHistory();
    this.renderHistoryList();
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
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
      this.themeToggleIcon.classList.remove('fa-sun');
      this.themeToggleIcon.classList.add('fa-moon');
    } else {
      document.body.classList.remove('light-mode');
      this.themeToggleIcon.classList.remove('fa-moon');
      this.themeToggleIcon.classList.add('fa-sun');
    }
  }

  private toggleTheme(): void {
    document.body.classList.toggle('light-mode');
    if (document.body.classList.contains('light-mode')) {
      localStorage.setItem('theme', 'light');
      this.themeToggleIcon.classList.remove('fa-sun');
      this.themeToggleIcon.classList.add('fa-moon');
    } else {
      localStorage.setItem('theme', 'dark');
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

    if (this.mainContent) {
        this.mainContent.classList.add('live-recording-active');
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
      this.editorTitle.getAttribute('placeholder') || 'Ghi chép chưa có tiêu đề';
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
    if (this.mainContent) {
        this.mainContent.classList.remove('live-recording-active');
    }
    if (this.recordingInterface) {
        this.recordingInterface.classList.remove('is-live');
    }

    if (
      !this.liveRecordingTitle ||
      !this.liveWaveformCanvas ||
      !this.liveRecordingTimerDisplay
    ) {
      return;
    }

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
    this.saveCurrentNoteToHistory();
    this.createNewNote(false); // Create a new note for the recording, but don't save again
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
        console.error('Thất bại với các ràng buộc cơ bản:', err);
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
        console.error('audio/webm không được hỗ trợ, đang thử mặc định:', e);
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
      this.recordButton.setAttribute('title', 'Dừng ghi âm');

      this.startLiveDisplay();
    } catch (error) {
      console.error('Lỗi bắt đầu ghi âm:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';

      if (
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError'
      ) {
        this.recordingStatus.textContent =
          'Quyền truy cập micro bị từ chối. Vui lòng kiểm tra cài đặt trình duyệt và tải lại trang.';
      } else if (
        errorName === 'NotFoundError' ||
        (errorName === 'DOMException' &&
          errorMessage.includes('Requested device not found'))
      ) {
        this.recordingStatus.textContent =
          'Không tìm thấy micro. Vui lòng kết nối micro.';
      } else if (
        errorName === 'NotReadableError' ||
        errorName === 'AbortError' ||
        (errorName === 'DOMException' &&
          errorMessage.includes('Failed to allocate audiosource'))
      ) {
        this.recordingStatus.textContent =
          'Không thể truy cập micro. Micro có thể đang được sử dụng bởi một ứng dụng khác.';
      } else {
        this.recordingStatus.textContent = `Lỗi: ${errorMessage}`;
      }

      this.isRecording = false;
      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }
      this.recordButton.classList.remove('recording');
      this.recordButton.setAttribute('title', 'Bắt đầu ghi âm');
      this.stopLiveDisplay();
    }
  }

  private async stopRecording(): Promise<void> {
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.error('Lỗi dừng MediaRecorder:', e);
        this.stopLiveDisplay();
      }

      this.isRecording = false;

      this.recordButton.classList.remove('recording');
      this.recordButton.setAttribute('title', 'Bắt đầu ghi âm');
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

      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          try {
            const base64data = reader.result;
            if (typeof base64data !== 'string') {
              return reject(
                new Error('FileReader result was not a string.'),
              );
            }
            const base64AudioData = base64data.split(',')[1];
            resolve(base64AudioData);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(audioBlob);
      });
      
      if (!base64Audio) {
        throw new Error('Không thể chuyển đổi âm thanh sang base64');
      }

      const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';

      if (this.currentNote) {
        this.currentNote.audioData = base64Audio;
        this.currentNote.audioMimeType = mimeType;
      }
      
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
      this.recordingStatus.textContent = 'Đang lấy bản phiên âm...';

      const contents = [
        {text: 'Tạo một bản phiên âm đầy đủ, chi tiết của đoạn âm thanh này.'},
        {inlineData: {mimeType: mimeType, data: base64Audio}},
      ];

      const response: GenerateContentResponse = await this.genAI.models.generateContent({
        model: MODEL_NAME,
        contents: {parts: contents},
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
        
        this.processTranscriptionAndPolish(transcriptionText).catch((err) => {
            console.error('Lỗi xử lý bản phiên âm:', err);
            this.recordingStatus.textContent = 'Lỗi xử lý bản phiên âm.';
        });
      } else {
        this.recordingStatus.textContent =
          'Phiên âm thất bại hoặc trống.';
        this.polishedNote.innerHTML =
          '<p><em>Không thể phiên âm âm thanh. Vui lòng thử lại.</em></p>';
        this.rawTranscription.textContent =
          this.rawTranscription.getAttribute('placeholder');
        this.rawTranscription.classList.add('placeholder-active');
      }
    } catch (error) {
      console.error('Lỗi lấy bản phiên âm:', error);
      this.recordingStatus.textContent =
        'Lỗi lấy bản phiên âm. Vui lòng thử lại.';
      this.polishedNote.innerHTML = `<p><em>Lỗi trong quá trình phiên âm: ${error instanceof Error ? error.message : String(error)}</em></p>`;
      this.rawTranscription.textContent =
        this.rawTranscription.getAttribute('placeholder');
      this.rawTranscription.classList.add('placeholder-active');
    }
  }

  private async processTranscriptionAndPolish(transcription: string): Promise<void> {
    try {
        if (!transcription || transcription.trim() === '' || this.rawTranscription.classList.contains('placeholder-active')) {
            this.recordingStatus.textContent = 'Không có bản phiên âm để trau chuốt';
            this.polishedNote.innerHTML = '<p><em>Không có bản phiên âm nào để trau chuốt.</em></p>';
            const placeholder = this.polishedNote.getAttribute('placeholder') || '';
            this.polishedNote.innerHTML = placeholder;
            this.polishedNote.classList.add('placeholder-active');
            return;
        }

        this.recordingStatus.textContent = 'Đang xác định ngôn ngữ...';
        const langDetectPrompt = `Is the following text primarily in English or Vietnamese? Answer with only the word "English" or "Vietnamese".\n\nText: "${transcription.substring(0, 500)}"`;
        const langResponse = await this.genAI.models.generateContent({
            model: MODEL_NAME,
            contents: langDetectPrompt,
        });
        const detectedLanguage = langResponse.text.trim().toLowerCase();

        let polishedText: string | null = null;

        if (detectedLanguage.includes('english')) {
            this.recordingStatus.textContent = 'Phát hiện tiếng Anh. Đang trau chuốt ghi chép...';
            const polishEnglishPrompt = `Based on this raw transcript, create a well-formatted and edited note in English. Remove filler words, repeated words, and unfinished sentences. Correctly format lists or bullet points using markdown. Retain the full original content and meaning.\n\nRaw Transcript:\n${transcription}`;
            const polishResponse = await this.genAI.models.generateContent({
                model: MODEL_NAME,
                contents: polishEnglishPrompt,
            });
            const polishedEnglishNote = polishResponse.text;

            if (!polishedEnglishNote || polishedEnglishNote.trim() === '') {
                throw new Error("Polishing English note returned empty content.");
            }

            this.recordingStatus.textContent = 'Đang dịch ghi chép sang tiếng Việt...';
            const translatePrompt = `Translate the following English markdown text to Vietnamese. Preserve all markdown formatting (headings, lists, bold, etc.) perfectly. Output only the translated Vietnamese text.\n\nEnglish Markdown Text:\n${polishedEnglishNote}`;
            const translateResponse = await this.genAI.models.generateContent({
                model: MODEL_NAME,
                contents: translatePrompt,
            });
            polishedText = translateResponse.text;
        } else {
            this.recordingStatus.textContent = 'Đang trau chuốt ghi chép...';
            const polishVietnamesePrompt = `Dựa vào bản phiên âm thô này, hãy tạo một ghi chép đã được chỉnh sửa và định dạng tốt. Loại bỏ các từ đệm (ừm, ờ, kiểu như), các từ lặp lại và các câu nói dang dở. Định dạng đúng bất kỳ danh sách hoặc gạch đầu dòng nào. Sử dụng định dạng markdown cho tiêu đề, danh sách, v.v. Giữ lại toàn bộ nội dung và ý nghĩa ban đầu.\n\nBản phiên âm thô:\n${transcription}`;
            const polishResponse = await this.genAI.models.generateContent({
                model: MODEL_NAME,
                contents: polishVietnamesePrompt,
            });
            polishedText = polishResponse.text;
        }

        if (polishedText && polishedText.trim() !== '') {
            await this.updatePolishedNoteUI(polishedText);
            if (detectedLanguage.includes('english')) {
                this.recordingStatus.textContent = 'Ghi chép đã được trau chuốt và dịch. Sẵn sàng cho bản ghi tiếp theo.';
            } else {
                this.recordingStatus.textContent = 'Ghi chép đã được trau chuốt. Sẵn sàng cho bản ghi tiếp theo.';
            }
        } else {
            this.recordingStatus.textContent = 'Trau chuốt ghi chép thất bại hoặc trống.';
            this.polishedNote.innerHTML = '<p><em>Việc trau chuốt ghi chép trả về kết quả trống. Ghi chép nguyên văn vẫn có sẵn.</em></p>';
            if (this.polishedNote.textContent?.trim() === '' || this.polishedNote.innerHTML.includes('<em>Việc trau chuốt ghi chép trả về kết quả trống')) {
                const placeholder = this.polishedNote.getAttribute('placeholder') || '';
                this.polishedNote.innerHTML = placeholder;
                this.polishedNote.classList.add('placeholder-active');
            }
        }
    } catch (error) {
        console.error('Lỗi xử lý ghi chép:', error);
        this.recordingStatus.textContent = 'Lỗi xử lý ghi chép. Vui lòng thử lại.';
        this.polishedNote.innerHTML = `<p><em>Lỗi trong quá trình xử lý: ${error instanceof Error ? error.message : String(error)}</em></p>`;
        if (this.polishedNote.textContent?.trim() === '' || this.polishedNote.innerHTML.includes('<em>Lỗi trong quá trình xử lý')) {
            const placeholder = this.polishedNote.getAttribute('placeholder') || '';
            this.polishedNote.innerHTML = placeholder;
            this.polishedNote.classList.add('placeholder-active');
        }
    }
  }

  private async updatePolishedNoteUI(polishedText: string, isFromHistoryLoad: boolean = false): Promise<void> {
    const htmlContent = await marked.parse(polishedText);
    this.polishedNote.innerHTML = htmlContent as string;
    if (polishedText && polishedText.trim() !== '') {
        this.polishedNote.classList.remove('placeholder-active');
    } else {
        const placeholder = this.polishedNote.getAttribute('placeholder') || '';
        this.polishedNote.innerHTML = placeholder;
        this.polishedNote.classList.add('placeholder-active');
    }

    if (this.currentNote) {
        this.currentNote.polishedNote = polishedText;
    }

    if (!isFromHistoryLoad) {
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
                  let potentialTitle = line.replace(/^[\*_\`#\->\s\[\]\(.\d)]+/, '');
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
          const placeholderText = this.editorTitle.getAttribute('placeholder') || 'Ghi chép chưa có tiêu đề';
          if (currentEditorText === '' || currentEditorText === placeholderText) {
              this.editorTitle.textContent = placeholderText;
              if (!this.editorTitle.classList.contains('placeholder-active')) {
                  this.editorTitle.classList.add('placeholder-active');
              }
          }
      }
    }

    if (this.currentNote) {
      this.currentNote.title = this.editorTitle.textContent || 'Ghi chép không có tiêu đề';
      if (!isFromHistoryLoad) {
          this.saveCurrentNoteToHistory();
      }
    }
  }

  private createNewNote(savePrevious = true): void {
    if (savePrevious) {
       this.saveCurrentNoteToHistory();
    }
    
    this.currentNote = {
      id: `note_${Date.now()}`,
      title: '',
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
        this.editorTitle.getAttribute('placeholder') || 'Ghi chép chưa có tiêu đề';
      this.editorTitle.textContent = placeholder;
      this.editorTitle.classList.add('placeholder-active');
    }
    this.recordingStatus.textContent = 'Sẵn sàng ghi âm';
    
    this.audioPlayerContainer.classList.add('hidden');
    this.historyAudioPlayer.src = '';

    if (this.isRecording) {
      this.mediaRecorder?.stop();
      this.isRecording = false;
      this.recordButton.classList.remove('recording');
    } else {
      this.stopLiveDisplay();
    }
  }

  private async downloadAsDocx(): Promise<void> {
    this.saveCurrentNoteToHistory();

    if (this.notesHistory.length === 0) {
        alert('Không có nội dung để tải xuống. Vui lòng ghi âm hoặc viết ghi chép trước.');
        return;
    }
    
    const notesInChronologicalOrder = [...this.notesHistory].reverse();
    const zip = new JSZip();

    // --- 1. Generate DOCX file ---
    const { Packer, Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } = docx;

    const docChildren: docx.Paragraph[] = [];

    docChildren.push(
        new Paragraph({
            children: [new TextRun({ text: 'Lịch sử Ghi chép Âm thanh', bold: true, size: 40 })],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 600 },
        })
    );
    
    for (const note of notesInChronologicalOrder) {
        docChildren.push(
            new Paragraph({
                children: [new TextRun({ text: note.title || 'Ghi chép không có tiêu đề', bold: true, size: 28 })],
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 100 },
            })
        );

        const date = new Date(note.timestamp).toLocaleString('vi-VN', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        docChildren.push(
            new Paragraph({
                children: [new TextRun({ text: `Đã lưu: ${date}`, italics: true, size: 20, color: "888888" })],
                spacing: { after: 300 },
            })
        );
        
        if (note.polishedNote && note.polishedNote.trim() !== '') {
            docChildren.push(
                new Paragraph({
                    children: [new TextRun({ text: 'Ghi chép đã trau chuốt', bold: true, size: 24 })],
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 200, after: 150 },
                })
            );
            note.polishedNote.split('\n').forEach(line => {
                if(line.trim() === '') return;
                let text = line;
                let bullet = undefined;
                if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                    text = line.trim().substring(2);
                    bullet = { level: 0 };
                }
                docChildren.push(new Paragraph({ text, bullet, spacing: { after: 100 } }));
            });
        }

        if (note.rawTranscription && note.rawTranscription.trim() !== '') {
            docChildren.push(
                new Paragraph({
                    children: [new TextRun({ text: 'Ghi chép nguyên văn', bold: true, size: 24 })],
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 150 },
                })
            );
            note.rawTranscription.split('\n').filter(line => line.trim() !== '').forEach(line => {
                docChildren.push(new Paragraph({ text: line, spacing: { after: 100 } }));
            });
        }

        docChildren.push(
            new Paragraph({
                spacing: { before: 300, after: 300 },
                border: {
                    bottom: { color: "auto", space: 1, style: BorderStyle.SINGLE, size: 6 },
                },
            })
        );
    }

    if (docChildren.length > 1) {
        docChildren.pop();
    }

    const doc = new Document({
        sections: [{
            properties: {},
            children: docChildren,
        }],
    });

    const docxBlob = await Packer.toBlob(doc);
    zip.file('Lịch sử Ghi chép.docx', docxBlob);

    // --- 2. Add audio files to zip ---
    const audioFolder = zip.folder('Bản ghi âm');
    if (audioFolder) {
        for (const note of notesInChronologicalOrder) {
            if (note.audioData && note.audioMimeType) {
                const audioBlob = base64ToBlob(note.audioData, note.audioMimeType);
                
                const extension = (note.audioMimeType.split('/')[1] || 'bin').split(';')[0];
                
                const datePrefix = new Date(note.timestamp).toISOString().replace(/[:.]/g, '-');
                
                const sanitizedTitle = (note.title || 'ghi_chep_khong_tieu_de')
                    .replace(/[^\p{L}\p{N} \._-]/gu, '') // Allow unicode letters, numbers, space, dot, underscore, hyphen
                    .replace(/\s+/g, '_')
                    .substring(0, 50);
                
                const fileName = `${datePrefix}_${sanitizedTitle}.${extension}`;
                
                audioFolder.file(fileName, audioBlob);
            }
        }
    }

    // --- 3. Generate and download ZIP file ---
    try {
        const zipBlob = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 9 }
        });

        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        const downloadDate = new Date().toISOString().split('T')[0];
        a.download = `Ghi chép âm thanh - ${downloadDate}.zip`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Lỗi tạo file ZIP:", error);
        alert("Đã xảy ra lỗi khi tạo tệp ZIP. Vui lòng thử lại.");
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

      el.addEventListener('blur', function (e) {
        const app = (window as any).voiceNotesApp;
        if (app && app.currentNote) {
            const field = this.id === 'polishedNote' ? 'polishedNote' : (this.id === 'rawTranscription' ? 'rawTranscription' : 'title');
            if (field === 'title' && this.textContent) {
                app.currentNote.title = this.textContent;
            }
            // Manual edits to polished note could be handled here if needed.
        }
        updatePlaceholderState();
      });
    });
});

export {};