import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Check,
  Copy,
  Mail,
  QrCode,
  ShieldCheck,
  Sparkles,
  Zap,
  Crown,
  ExternalLink,
  Smartphone,
  Building2,
} from 'lucide-react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  const UPI_ID = '7571889019@ybl';
  const SUPPORT_EMAIL = 'dubeyrishi135@gmail.com';
  const BANK_INFO = 'Union Bank Of India - 0373';

  // Standard UPI URI format
  const upiUri = `upi://pay?pa=${UPI_ID}&pn=VibeCast%20Studio&cu=INR&tn=VibeCast%20Premium%20Service`;

  useEffect(() => {
    QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0B100D',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation error:', err));
  }, [upiUri]);

  if (!isOpen) return null;

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    } catch (e) {
      console.warn('Copy UPI failed', e);
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    } catch (e) {
      console.warn('Copy Email failed', e);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl spatial-glass rounded-[28px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-black/45 text-white px-6 sm:px-8 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#E14B5A] text-white flex items-center justify-center shadow-md border border-white/20">
              <Crown className="w-5 h-5 text-[#F0C05A] fill-[#F0C05A]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-bold-italic text-2xl tracking-tight text-white">VibeCast</span>
                <span className="font-syne font-black text-[10px] uppercase tracking-widest text-[#F0C05A]">
                  · PRO STUDIO
                </span>
              </div>
              <p className="text-xs text-white/65">
                Unlimited 24kHz Voice Synthesis & Direct Creator UPI Support
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* Premium Perks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Zap className="w-4 h-4 text-[#F0C05A]" />
                <span>Unlimited Quota</span>
              </div>
              <p className="text-[11px] text-white/65 leading-relaxed">
                Remove daily character and script synthesis limits completely.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Priority Generation</span>
              </div>
              <p className="text-[11px] text-white/65 leading-relaxed">
                Dedicated studio lane for fast 24kHz Indian & English voice synthesis.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <ShieldCheck className="w-4 h-4 text-[#FF8A98]" />
                <span>VIP Support</span>
              </div>
              <p className="text-[11px] text-white/65 leading-relaxed">
                Direct email response and custom voice calibration support.
              </p>
            </div>
          </div>

          {/* Payment Section (QR Code & UPI ID) */}
          <div className="bg-black/35 border border-white/12 rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#FF8A98]" />
                <h4 className="text-sm font-bold font-fraunces text-white">
                  Scan & Pay via any UPI App
                </h4>
              </div>
              <span className="text-[11px] font-mono-numbers text-emerald-300 font-bold uppercase tracking-wider">
                Instant UPI Verification
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              {/* High-Contrast QR Code Container */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center p-3.5 bg-white/[0.05] rounded-2xl border border-white/15">
                {qrDataUrl ? (
                  <div className="bg-white p-2.5 rounded-xl shadow-md relative">
                    <img
                      src={qrDataUrl}
                      alt="VibeCast UPI QR Code"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-8 h-8 rounded-full bg-[#5F259F] text-white flex items-center justify-center text-[10px] font-bold shadow-md border border-white">
                        पे
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center bg-white/10 text-white/50 rounded-xl text-xs">
                    Loading QR...
                  </div>
                )}
                <div className="mt-2.5 text-center">
                  <span className="text-[10px] text-white/65 font-mono-numbers uppercase tracking-wider font-semibold">
                    Works with all UPI apps
                  </span>
                </div>
              </div>

              {/* UPI Details & Copy */}
              <div className="sm:col-span-7 space-y-3.5">
                {/* Bank Banner */}
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <Building2 className="w-4 h-4 text-[#F0C05A] flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-white">{BANK_INFO}</p>
                    <p className="text-[11px] text-white/60">Verified receiving account for VibeCast Studio</p>
                  </div>
                </div>

                {/* UPI ID Field with Copy Button */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-white/65 uppercase tracking-wider font-mono-numbers">
                    UPI ID:
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-2.5 rounded-xl bg-black/45 border border-white/15 font-mono-numbers font-bold text-sm text-white tracking-wide select-all">
                      {UPI_ID}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                        copiedUpi
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#E14B5A] hover:bg-[#C83746] text-white'
                      }`}
                    >
                      {copiedUpi ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Direct Pay Button */}
                <div>
                  <a
                    href={upiUri}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#5F259F] hover:bg-[#4E1E85] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-white/15"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Open in PhonePe / GPay / Paytm</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                </div>

                {/* Supported Apps text */}
                <div className="pt-1 flex items-center justify-between text-[11px] text-white/55 font-semibold border-t border-white/10">
                  <span>PhonePe</span>
                  <span>·</span>
                  <span>Google Pay</span>
                  <span>·</span>
                  <span>Paytm</span>
                  <span>·</span>
                  <span>BHIM UPI</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Support Email Box */}
          <div className="bg-white/[0.03] border border-white/12 rounded-2xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#FF8A98]" />
              <h4 className="text-sm font-bold font-fraunces text-white">
                Support & Payment Confirmation
              </h4>
            </div>

            <p className="text-xs text-white/65 leading-relaxed">
              After completing your UPI payment, share your transaction reference or screenshot for instant plan activation.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-black/35 border border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E14B5A]/20 text-[#FF8A98] border border-[#E14B5A]/30 flex items-center justify-center font-bold text-xs">
                  @
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/50 block">
                    Official Support Email
                  </span>
                  <span className="font-mono-numbers font-bold text-sm text-white">
                    {SUPPORT_EMAIL}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/12 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
                </button>

                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=VibeCast%20Premium%20Subscription%20Screenshot&body=Hello%20VibeCast%20Team%2C%0A%0AI%20have%20completed%20the%20UPI%20payment%20to%207571889019%40ybl.%20Attached%20is%20my%20payment%20screenshot%2Ftransaction%20ID.%0A%0AThank%20you!`}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#2E4E3B] hover:bg-[#233C2D] text-white border border-emerald-400/25 flex items-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Mail</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-black/45 px-6 sm:px-8 py-3.5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <span className="font-mono-numbers">
            VibeCast Studio · Direct UPI Processing
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-[#FF8A98] hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
