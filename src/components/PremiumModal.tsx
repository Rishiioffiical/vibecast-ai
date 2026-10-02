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
  CreditCard,
  Building2,
  CheckCircle2,
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
        dark: '#1C201C',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#FAF7EF] border-2 border-[#D8CEBC] rounded-[32px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="bg-[#344638] text-[#FAF7EF] px-6 sm:px-8 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#B83848] text-white flex items-center justify-center shadow-md">
              <Crown className="w-5 h-5 text-[#F0C05A] fill-[#F0C05A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold-italic text-2xl tracking-tight text-[#FAF7EF]">VibeCast</span>
                <span className="font-syne font-black text-xs uppercase px-2 py-0.5 rounded-full bg-[#F0C05A] text-[#1F261F]">
                  Premium
                </span>
              </div>
              <p className="text-xs text-[#CBD8CD]">
                Upgrade to Unlimited Voice Synthesis & Creator Support
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-[#FAF7EF] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* Premium Perks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#F2ECE0] border border-[#DFD6C7] space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F261F]">
                <Zap className="w-4 h-4 text-[#B83848]" />
                <span>Unlimited Quota</span>
              </div>
              <p className="text-[11px] text-[#5C6E60] leading-relaxed">
                Remove the 25k daily character & script limits completely.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F2ECE0] border border-[#DFD6C7] space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F261F]">
                <Sparkles className="w-4 h-4 text-[#2E4E3B]" />
                <span>Priority Generation</span>
              </div>
              <p className="text-[11px] text-[#5C6E60] leading-relaxed">
                Dedicated compute lane for near-instant 24kHz audio synthesis.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F2ECE0] border border-[#DFD6C7] space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1F261F]">
                <ShieldCheck className="w-4 h-4 text-[#B83848]" />
                <span>VIP Support</span>
              </div>
              <p className="text-[11px] text-[#5C6E60] leading-relaxed">
                Direct email response and prompt custom voice adjustments.
              </p>
            </div>
          </div>

          {/* Payment Section (QR Code & UPI ID) */}
          <div className="bg-[#FFFFFF] border-2 border-[#DFD6C7] rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D4]">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#B83848]" />
                <h4 className="text-sm font-bold font-fraunces text-[#1F261F]">
                  Scan & Pay via any UPI App
                </h4>
              </div>
              <span className="text-[11px] font-mono-numbers px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Instant UPI
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              {/* QR Code Container */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-[#1C201C] rounded-2xl shadow-md border-2 border-[#FAF7EF]">
                {qrDataUrl ? (
                  <div className="bg-white p-2 rounded-xl shadow-inner relative group">
                    <img
                      src={qrDataUrl}
                      alt="VibeCast PhonePe UPI QR Code"
                      className="w-44 h-44 object-contain rounded-lg"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-8 h-8 rounded-full bg-[#5F259F] text-white flex items-center justify-center text-[10px] font-bold shadow-md border border-white">
                        पे
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center bg-gray-100 text-gray-400 rounded-xl">
                    Loading QR...
                  </div>
                )}
                <div className="mt-2 text-center">
                  <span className="text-[10px] text-[#CBD8CD] font-mono-numbers uppercase tracking-wider font-semibold">
                    Supported on all UPI apps
                  </span>
                </div>
              </div>

              {/* UPI Details & Copy */}
              <div className="sm:col-span-7 space-y-3.5">
                {/* Bank Banner */}
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F5F2EB] border border-[#E0D8CA]">
                  <Building2 className="w-4 h-4 text-[#5F259F] flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-[#1F261F]">{BANK_INFO}</p>
                    <p className="text-[11px] text-[#6A786E]">Primary verified account for receiving payments</p>
                  </div>
                </div>

                {/* UPI ID Field with Copy Button */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#4A554D] uppercase tracking-wider font-mono-numbers">
                    UPI ID:
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-2.5 rounded-xl bg-[#F4EFE6] border-2 border-[#DFD6C7] font-mono-numbers font-bold text-sm text-[#1F261F] tracking-wide select-all">
                      {UPI_ID}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                        copiedUpi
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#B83848] hover:bg-[#9E2A3B] text-white'
                      }`}
                    >
                      {copiedUpi ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedUpi ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Mobile Direct Pay Button */}
                <div>
                  <a
                    href={upiUri}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#5F259F] hover:bg-[#4E1E85] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Open in PhonePe / GPay / Paytm</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                  </a>
                </div>

                {/* Supported Apps Logos text */}
                <div className="pt-1 flex items-center justify-between text-[11px] text-[#7A877C] font-semibold border-t border-[#EAE3D4]">
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
          <div className="bg-[#FAF7EF] border-2 border-[#DFD6C7] rounded-3xl p-5 sm:p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#B83848]" />
              <h4 className="text-sm font-bold font-fraunces text-[#1F261F]">
                Support & Payment Confirmation
              </h4>
            </div>

            <p className="text-xs text-[#5C6E60] leading-relaxed">
              After completing the UPI payment, simply share your transaction screenshot or payment reference with us for instant verification and plan activation.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-[#DFD6C7]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#B83848]/10 text-[#B83848] flex items-center justify-center font-bold">
                  @
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#8C988E] block">
                    Official Support Email
                  </span>
                  <span className="font-mono-numbers font-bold text-sm text-[#1F261F]">
                    {SUPPORT_EMAIL}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#F4EFE6] hover:bg-[#EAE3D4] text-[#1F261F] border border-[#DFD6C7] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
                </button>

                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=VibeCast%20Premium%20Subscription%20Screenshot&body=Hello%20VibeCast%20Team%2C%0A%0AI%20have%20completed%20the%20UPI%20payment%20to%207571889019%40ybl.%20Attached%20is%20my%20payment%20screenshot%2Ftransaction%20ID.%0A%0AThank%20you!`}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-[#2E4E3B] hover:bg-[#233C2D] text-white flex items-center gap-1.5 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Mail</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#F5F1E6] px-6 sm:px-8 py-3.5 border-t border-[#DFD6C7] flex items-center justify-between text-xs text-[#6A786E]">
          <span className="font-mono-numbers">
            VibeCast Studio · 100% Secure UPI Processing
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-[#B83848] hover:underline cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
