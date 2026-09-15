import React, { useState, useRef } from 'react';
import { Sparkles, Image as ImageIcon, Edit3, Check, Upload, RefreshCw, Quote } from 'lucide-react';
import { VisualAffirmation as AffirmationType } from '../types';
import { useProtectedAction } from '../context/ProtectedActionContext';

interface VisualAffirmationProps {
  affirmation: AffirmationType;
  onSave: (affirmation: AffirmationType) => Promise<void>;
}

const PRESET_QUOTES = [
  { quote: 'Small progress every single day creates massive long-term results.', author: 'Robin Sharma' },
  { quote: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Will Durant' },
  { quote: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
  { quote: 'Focus on being productive instead of busy.', author: 'Tim Ferriss' },
  { quote: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
];

export const VisualAffirmation: React.FC<VisualAffirmationProps> = ({
  affirmation,
  onSave,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [quote, setQuote] = useState(affirmation.quote);
  const [author, setAuthor] = useState(affirmation.author || '');
  const [imageUrl, setImageUrl] = useState(affirmation.image_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { executeProtected } = useProtectedAction();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave({
        quote: quote.trim() || 'Small progress every day creates massive results.',
        author: author.trim() || 'Vignesh',
        image_url: imageUrl,
      });
      setIsEditing(false);
    } catch (e) {
      console.error('Error saving affirmation:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleEdit = () => {
    if (isEditing) {
      handleSave();
    } else {
      executeProtected(() => {
        setQuote(affirmation.quote);
        setAuthor(affirmation.author || '');
        setImageUrl(affirmation.image_url || '');
        setIsEditing(true);
      }, 'Edit Visual Affirmation');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Convert to base64 data URL for instant client & cloud persistence
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePickRandomPreset = () => {
    const random = PRESET_QUOTES[Math.floor(Math.random() * PRESET_QUOTES.length)];
    setQuote(random.quote);
    setAuthor(random.author);
  };

  return (
    <div className="bg-[#FFFFFF] rounded-3xl border border-[#ECE6DC] shadow-xs p-5 sm:p-6 mb-8 overflow-hidden relative">
      <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1] mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FAF4EE] text-[#8A674D] flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-[#2D2A26] tracking-tight">
              VISUAL AFFIRMATION
            </h2>
            <p className="text-xs text-[#7D766C]">
              Your daily vision, mindset, and motivational anchor
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleEdit}
          disabled={isSaving}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
            isEditing
              ? 'bg-[#5B8266] text-white hover:bg-[#4C7156]'
              : 'bg-[#FAF8F5] text-[#5C554B] hover:bg-[#F2ECE4] border border-[#E5DFD5]'
          }`}
        >
          {isEditing ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Done'}</span>
            </>
          ) : (
            <>
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Affirmation</span>
            </>
          )}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-4 pt-1 animate-in fade-in duration-200">
          <div>
            <label className="block text-xs font-semibold text-[#736A5E] mb-1.5">
              Motivational Quote
            </label>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={2}
              className="w-full p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#E5DFD5] text-sm text-[#2D2A26] focus:outline-none focus:border-[#5B8266]"
              placeholder="Enter your personal affirmation..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#736A5E] mb-1.5">
                Author / Intent
              </label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Robin Sharma or Personal Motto"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F5] border border-[#E5DFD5] text-xs text-[#2D2A26] focus:outline-none focus:border-[#5B8266]"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handlePickRandomPreset}
                className="px-3 py-2.5 rounded-xl bg-[#FAF4EE] text-[#8A674D] border border-[#EFE4D7] text-xs font-semibold hover:bg-[#F5ECE0] transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Random Quote</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2.5 rounded-xl bg-[#F4EFEA] text-[#5C554B] border border-[#E5DFD5] text-xs font-semibold hover:bg-[#ECE5DC] transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{imageUrl ? 'Change Image' : 'Upload Vision Image'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-[#FAF8F5] border border-[#ECE6DC]">
          {imageUrl && (
            <div className="w-full sm:w-44 h-32 rounded-xl overflow-hidden shrink-0 border border-[#E0D8CB] bg-white shadow-2xs">
              <img
                src={imageUrl}
                alt="Affirmation Vision"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="flex-1 text-center sm:text-left">
            <Quote className="w-6 h-6 text-[#D5CDC0] mb-1 mx-auto sm:mx-0" />
            <p className="text-base sm:text-lg font-serif italic text-[#2D2A26] leading-relaxed">
              "{affirmation.quote}"
            </p>
            {affirmation.author && (
              <p className="text-xs font-semibold uppercase tracking-wider text-[#8A674D] mt-2">
                — {affirmation.author}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
