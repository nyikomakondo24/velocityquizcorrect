import React, { useState, useRef } from 'react';
import { Quiz, Question } from '../../types/quiz';
import { sound } from '../../utils/sound';
import { prepareQuizImage } from '../../utils/images';
import {
  Plus,
  Trash2,
  Save,
  Download,
  Upload,
  ArrowLeft,
  Clock,
  Image as ImageIcon,
  FileSpreadsheet,
  X,
  FileDown,
} from 'lucide-react';

interface QuizEditorModalProps {
  initialQuiz?: Quiz | null;
  onSaveQuiz: (quiz: Quiz) => void;
  onCancel: () => void;
}

export const QuizEditorModal: React.FC<QuizEditorModalProps> = ({
  initialQuiz,
  onSaveQuiz,
  onCancel,
}) => {
  const [title, setTitle] = useState(initialQuiz?.title || 'Custom Velocity Quiz');
  const [description, setDescription] = useState(
    initialQuiz?.description || 'Fast-paced custom speed trivia competition.'
  );
  const [category, setCategory] = useState(initialQuiz?.category || 'General Knowledge');

  const [questions, setQuestions] = useState<Question[]>(
    initialQuiz?.questions || [
      {
        id: `q_${Date.now()}_1`,
        text: 'What is the largest ocean on Earth?',
        options: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'],
        correctOptionIndex: 2,
        timeLimit: 12,
        points: 1000,
        explanation: 'The Pacific Ocean covers over 30% of Earth’s total surface area.',
      },
      {
        id: `q_${Date.now()}_2`,
        text: 'How many milliseconds are in one second?',
        options: ['10 ms', '100 ms', '1,000 ms', '10,000 ms'],
        correctOptionIndex: 2,
        timeLimit: 10,
        points: 1000,
        explanation: 'There are exactly 1,000 milliseconds in one second.',
      },
    ]
  );

  const [activeQIndex, setActiveQIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const activeQuestion = questions[activeQIndex] || questions[0];

  const handleUpdateActiveQ = (updates: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q, idx) => (idx === activeQIndex ? { ...q, ...updates } : q))
    );
  };

  const handleUpdateOption = (optIndex: number, val: string) => {
    if (!activeQuestion) return;
    const newOptions = [...activeQuestion.options];
    newOptions[optIndex] = val;
    handleUpdateActiveQ({ options: newOptions });
  };

  const handleAddQuestion = () => {
    sound.playSelect();
    const newQ: Question = {
      id: `q_${Date.now()}_${questions.length + 1}`,
      text: 'New question prompt...',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctOptionIndex: 0,
      timeLimit: 12,
      points: 1000,
      explanation: '',
    };
    setQuestions([...questions, newQ]);
    setActiveQIndex(questions.length);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    sound.playSelect();
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    setActiveQIndex(Math.max(0, idx - 1));
  };

  // Keep clue images small enough for phones and the shared server.
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const questionId = activeQuestion.id;
    try {
      const imageUrl = await prepareQuizImage(file);
      setQuestions(previous => previous.map(question => question.id === questionId ? { ...question, imageUrl } : question));
      sound.playSelect();
      setStatusMessage(`Attached optimized image: ${file.name}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Could not load image.');
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // Excel (.xlsx / .xls) Importer
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          alert('Excel workbook has no sheets.');
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);
        if (!rawRows || rawRows.length === 0) {
          alert('The Excel sheet appears to be empty.');
          return;
        }

        const parsedQuestions: Question[] = [];
        rawRows.forEach((row, idx) => {
          // Flexible column detection
          const qText =
            row['Question'] ||
            row['Question Text'] ||
            row['Prompt'] ||
            row['text'] ||
            row['question'] ||
            Object.values(row)[0];
          if (!qText) return;

          const opt1 = String(row['Option 1'] || row['Option1'] || row['Choice 1'] || row['A'] || row['Option A'] || 'Option 1');
          const opt2 = String(row['Option 2'] || row['Option2'] || row['Choice 2'] || row['B'] || row['Option B'] || 'Option 2');
          const opt3 = String(row['Option 3'] || row['Option3'] || row['Choice 3'] || row['C'] || row['Option C'] || 'Option 3');
          const opt4 = String(row['Option 4'] || row['Option4'] || row['Choice 4'] || row['D'] || row['Option D'] || 'Option 4');
          const options = [opt1, opt2, opt3, opt4];

          const rawCorrect =
            row['Correct Option'] ??
            row['Correct'] ??
            row['Correct Answer'] ??
            row['Answer'] ??
            1;

          let correctIndex = 0;
          if (typeof rawCorrect === 'number') {
            correctIndex =
              rawCorrect >= 1 && rawCorrect <= 4 ? rawCorrect - 1 : Math.max(0, Math.min(3, rawCorrect));
          } else {
            const str = String(rawCorrect).trim().toUpperCase();
            if (str === 'A' || str === '1') correctIndex = 0;
            else if (str === 'B' || str === '2') correctIndex = 1;
            else if (str === 'C' || str === '3') correctIndex = 2;
            else if (str === 'D' || str === '4') correctIndex = 3;
            else {
              const found = options.findIndex((o) => o.toLowerCase() === str.toLowerCase());
              if (found !== -1) correctIndex = found;
            }
          }

          const timeLimit = parseInt(
            row['Time Limit'] || row['Time (sec)'] || row['Timer'] || row['Seconds'] || '12',
            10
          );
          const points = parseInt(
            row['Points'] || row['Score'] || row['Max Points'] || '1000',
            10
          );
          const explanation = row['Explanation'] || row['Trivia'] || row['Fun Fact'] || '';
          const cat = row['Category'] || row['Topic'] || category;
          const imgUrl = row['Image'] || row['Image URL'] || row['ImageUrl'] || row['Graphic'] || '';

          parsedQuestions.push({
            id: `q_xl_${Date.now()}_${idx + 1}`,
            text: String(qText),
            options,
            correctOptionIndex: correctIndex,
            timeLimit: isNaN(timeLimit) ? 12 : timeLimit,
            points: isNaN(points) ? 1000 : points,
            category: String(cat),
            explanation: String(explanation),
            imageUrl: imgUrl ? String(imgUrl) : undefined,
          });
        });

        if (parsedQuestions.length > 0) {
          setQuestions(parsedQuestions);
          setActiveQIndex(0);
          sound.playSelect();
          setStatusMessage(`Successfully imported ${parsedQuestions.length} questions from Excel!`);
          setTimeout(() => setStatusMessage(null), 4000);
        } else {
          alert('Could not find recognizable question rows in this spreadsheet.');
        }
      } catch (err) {
        console.error('Error importing Excel:', err);
        alert('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download Sample Excel Template
  const handleDownloadExcelTemplate = async () => {
    const XLSX = await import('xlsx');
    sound.playSelect();
    const templateData = [
      {
        'Question': 'What is the speed of sound at sea level?',
        'Option 1': '343 m/s',
        'Option 2': '150 m/s',
        'Option 3': '768 m/s',
        'Option 4': '1,200 m/s',
        'Correct Option': 1,
        'Time Limit': 12,
        'Points': 1000,
        'Category': 'Physics',
        'Explanation': 'Sound travels at approximately 343 meters per second in air at 20°C.',
        'Image URL': '',
      },
      {
        'Question': 'Which galaxy is closest to the Milky Way?',
        'Option 1': 'Triangulum',
        'Option 2': 'Andromeda',
        'Option 3': 'Whirlpool',
        'Option 4': 'Sombrero',
        'Correct Option': 2,
        'Time Limit': 15,
        'Points': 1000,
        'Category': 'Astronomy',
        'Explanation': 'Andromeda is about 2.5 million light-years from Earth.',
        'Image URL': '',
      },
      {
        'Question': 'What is the powerhouse organelle of eukaryotic cells?',
        'Option 1': 'Ribosome',
        'Option 2': 'Golgi Apparatus',
        'Option 3': 'Mitochondria',
        'Option 4': 'Nucleolus',
        'Correct Option': 3,
        'Time Limit': 10,
        'Points': 1000,
        'Category': 'Biology',
        'Explanation': 'Mitochondria generate most of the cell’s chemical energy through ATP.',
        'Image URL': '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'QuizQuestions');
    XLSX.writeFile(workbook, 'velocity_quiz_template.xlsx');
  };

  const handleSave = () => {
    if (!title.trim() || questions.length === 0) return;
    sound.playSelect();
    const newQuiz: Quiz = {
      id: initialQuiz?.id || `custom_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      questions,
      isCustom: true,
      createdAt: initialQuiz?.createdAt || Date.now(),
    };
    onSaveQuiz(newQuiz);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6 animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black font-display text-white">Quiz Studio & Editor</h1>
            <p className="text-xs text-slate-400">
              Add images to questions and import quizzes seamlessly from Excel (.xlsx)
            </p>
          </div>
        </div>

        {/* Action Controls: Excel Import, Template, Save */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Excel Template */}
          <button
            onClick={handleDownloadExcelTemplate}
            title="Download formatted sample Excel sheet"
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <FileDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>Excel Template</span>
          </button>

          {/* Import XLSX */}
          <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border border-slate-700">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Import (.xlsx)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={handleImportExcel}
              className="hidden"
            />
          </label>

          <button
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save & Use Quiz</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <span>✓</span>
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Quiz Metadata */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
            Quiz Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-slate-300 mb-1">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Split Questions Navigator & Question Form */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left: Questions List */}
        <div className="md:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Questions ({questions.length})
            </span>
            <button
              onClick={handleAddQuestion}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  sound.playSelect();
                  setActiveQIndex(idx);
                }}
                className={`w-full text-left p-3 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                  idx === activeQIndex
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 mb-0.5">
                    <span>Q{idx + 1}</span>
                    <span>· {q.timeLimit}s</span>
                    {q.imageUrl && <span className="text-amber-400">· 🖼️ Image</span>}
                  </div>
                  <p className="text-xs font-bold truncate text-slate-200">{q.text}</p>
                </div>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteQuestion(idx);
                    }}
                    className="p-1 hover:text-rose-400 text-slate-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Active Question Form */}
        {activeQuestion && (
          <div className="md:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col gap-5">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1.5">
                Question Text #{activeQIndex + 1}
              </label>
              <textarea
                rows={2}
                value={activeQuestion.text}
                onChange={(e) => handleUpdateActiveQ({ text: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-base font-bold text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>

            {/* Universal Image Attachment (Upload Any Format or URL) */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  <span>Question Image (PNG, JPG, GIF, WebP, SVG, AVIF)</span>
                </label>
                {activeQuestion.imageUrl && (
                  <button
                    type="button"
                    onClick={() => handleUpdateActiveQ({ imageUrl: undefined })}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove Image</span>
                  </button>
                )}
              </div>

              {activeQuestion.imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 max-h-52 flex items-center justify-center p-2 group">
                  <img
                    src={activeQuestion.imageUrl}
                    alt="Question clue preview"
                    className="max-h-48 w-auto object-contain rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                    <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">
                      <span>Change Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* File Upload Button */}
                  <label className="p-4 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-colors bg-slate-900/40">
                    <Upload className="w-5 h-5 text-indigo-400" />
                    <span className="text-xs font-bold text-white">Upload Image File</span>
                    <span className="text-[10px] text-slate-500">Any format (PNG, JPG, SVG, GIF, WebP)</span>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Direct URL input */}
                  <div className="flex flex-col justify-center p-3 border border-slate-800 rounded-xl bg-slate-900/40 gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400">Or Paste Image URL:</span>
                    <input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={activeQuestion.imageUrl || ''}
                      onChange={(e) => handleUpdateActiveQ({ imageUrl: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Time limit & Points row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Time Limit (Seconds)</span>
                </label>
                <select
                  value={activeQuestion.timeLimit}
                  onChange={(e) =>
                    handleUpdateActiveQ({ timeLimit: parseInt(e.target.value, 10) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={8}>8 Seconds (Ultra Blitz)</option>
                  <option value={10}>10 Seconds (Very Fast)</option>
                  <option value={12}>12 Seconds (Standard Speed)</option>
                  <option value={15}>15 Seconds (Normal)</option>
                  <option value={20}>20 Seconds (Comfortable)</option>
                  <option value={30}>30 Seconds (Deep Thinker)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                  Max Points (Scaled by speed)
                </label>
                <select
                  value={activeQuestion.points}
                  onChange={(e) =>
                    handleUpdateActiveQ({ points: parseInt(e.target.value, 10) })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={500}>500 Points</option>
                  <option value={1000}>1,000 Points (Standard)</option>
                  <option value={1500}>1,500 Points</option>
                  <option value={2000}>2,000 Points (Double Down)</option>
                </select>
              </div>
            </div>

            {/* 4 Choices Editor */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-2">
                Answer Options (Select radio for the correct answer)
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {activeQuestion.options.map((opt, oIdx) => {
                  const isCorrect = activeQuestion.correctOptionIndex === oIdx;
                  return (
                    <div
                      key={oIdx}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isCorrect
                          ? 'bg-emerald-950/40 border-emerald-500/60'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="correctOption"
                        checked={isCorrect}
                        onChange={() => handleUpdateActiveQ({ correctOptionIndex: oIdx })}
                        className="w-4 h-4 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-400 w-6">
                        #{oIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleUpdateOption(oIdx, e.target.value)}
                        placeholder={`Option ${oIdx + 1}`}
                        className="flex-1 bg-transparent text-sm font-semibold text-white focus:outline-none"
                      />
                      {isCorrect && (
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded uppercase">
                          Correct
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation snippet */}
            <div>
              <label className="block text-xs font-bold uppercase text-slate-300 mb-1">
                Trivia Fact / Explanation (Shown on Reveal)
              </label>
              <input
                type="text"
                value={activeQuestion.explanation || ''}
                onChange={(e) => handleUpdateActiveQ({ explanation: e.target.value })}
                placeholder="e.g. Light moves at ~300,000 km/s in a vacuum."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
