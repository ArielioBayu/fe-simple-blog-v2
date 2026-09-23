"use client";

import React, { useState, useEffect, useRef } from 'react';
import { authService } from '@/services';
import { useTheme } from '@/context';

interface OtpVerificationModalProps {
  visible: boolean;
  email: string;
  onClose: () => void;
  onSuccess?: () => void;
  initialCountdown?: number;
}

export function OtpVerificationModal({
  visible,
  email,
  onClose,
  onSuccess,
  initialCountdown = 60,
}: OtpVerificationModalProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [countdown, setCountdown] = useState(initialCountdown);
  const [animateOut, setAnimateOut] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setOtpDigits(['', '', '', '', '', '']);
      setError(null);
      setSuccessMsg(null);
      setIsVerified(false);
      setCountdown(initialCountdown);
      setAnimateOut(false);

      // Focus first input box shortly after modal displays
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [visible, initialCountdown]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (!visible || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, countdown]);

  if (!visible && !animateOut) return null;

  const handleClose = () => {
    setAnimateOut(true);
    setTimeout(() => {
      onClose();
      setAnimateOut(false);
    }, 320);
  };

  const handleDigitChange = (index: number, val: string) => {
    setError(null);
    const cleaned = val.replace(/\D/g, ''); // numbers only

    if (!cleaned) {
      const nextDigits = [...otpDigits];
      nextDigits[index] = '';
      setOtpDigits(nextDigits);
      return;
    }

    // If pasted or multiple characters
    if (cleaned.length > 1) {
      handlePastedCode(cleaned);
      return;
    }

    const nextDigits = [...otpDigits];
    nextDigits[index] = cleaned[0];
    setOtpDigits(nextDigits);

    // Auto advance to next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits completed
    const fullOtp = nextDigits.join('');
    if (fullOtp.length === 6 && !nextDigits.includes('')) {
      handleVerify(fullOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePastedCode = (code: string) => {
    const digitsOnly = code.replace(/\D/g, '').slice(0, 6);
    if (!digitsOnly) return;

    const nextDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < digitsOnly.length; i++) {
      nextDigits[i] = digitsOnly[i];
    }
    setOtpDigits(nextDigits);

    if (digitsOnly.length === 6) {
      inputRefs.current[5]?.focus();
      handleVerify(digitsOnly);
    } else {
      inputRefs.current[digitsOnly.length]?.focus();
    }
  };

  const handleVerify = async (codeToVerify?: string) => {
    const fullOtp = codeToVerify || otpDigits.join('');
    if (fullOtp.length !== 6) {
      setError('Harap masukkan 6 digit kode OTP secara lengkap.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authService.verifyOtp({
        email: email.trim(),
        otp: fullOtp,
      });

      setIsVerified(true);
      setSuccessMsg('Email berhasil diverifikasi! Mengalihkan...');
      setTimeout(() => {
        handleClose();
        if (onSuccess) {
          onSuccess();
        }
      }, 1400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kode OTP tidak valid atau telah kedaluwarsa.';
      setError(msg);
      // Clear inputs for easy retry
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await authService.resendOtp({ email: email.trim() });
      setSuccessMsg('Kode OTP baru telah dikirimkan ke email Anda.');
      setCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim ulang OTP. Silakan tunggu beberapa saat.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  const backdropClass = `otp-backdrop${animateOut ? ' out' : ''}`;
  const cardClass = `otp-card${animateOut ? ' out' : ''}`;

  return (
    <>
      <style>{`
        @keyframes otpBackdropFadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
          to   { opacity: 1; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        }
        @keyframes otpBackdropFadeOut {
          from { opacity: 1; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
          to   { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
        }
        @keyframes otpModalSpringIn {
          0% {
            opacity: 0;
            transform: translateY(35px) scale(0.92);
          }
          65% {
            opacity: 1;
            transform: translateY(-4px) scale(1.018);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes otpModalSpringOut {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(22px) scale(0.94);
          }
        }
        @keyframes otpBadgePulse {
          0%, 100% {
            transform: translateY(0) scale(1);
            box-shadow: 0 10px 26px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.45);
          }
          50% {
            transform: translateY(-3.5px) scale(1.04);
            box-shadow: 0 16px 34px rgba(99, 102, 241, 0.48), 0 0 0 10px rgba(99, 102, 241, 0);
          }
        }
        @keyframes otpErrorShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        @keyframes otpCheckmarkPop {
          0% { transform: scale(0) rotate(-45deg); opacity: 0; }
          70% { transform: scale(1.22) rotate(6deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }

        .otp-backdrop { animation: otpBackdropFadeIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .otp-backdrop.out { animation: otpBackdropFadeOut 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .otp-card { animation: otpModalSpringIn 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .otp-card.out { animation: otpModalSpringOut 0.28s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

        .otp-close-btn {
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
                      background-color 0.2s ease,
                      color 0.2s ease,
                      box-shadow 0.2s ease,
                      border-color 0.2s ease !important;
        }
        .otp-close-btn:hover {
          transform: rotate(90deg) scale(1.1) !important;
          background-color: rgba(239, 68, 68, 0.12) !important;
          color: #EF4444 !important;
          border-color: rgba(239, 68, 68, 0.3) !important;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2) !important;
        }
        .otp-close-btn:active {
          transform: rotate(90deg) scale(0.92) !important;
        }

        .otp-digit-input {
          width: 50px !important;
          height: 58px !important;
          min-width: 50px !important;
          min-height: 58px !important;
          padding: 0 !important;
          margin: 0 !important;
          text-align: center !important;
          font-size: 24px !important;
          font-weight: 700 !important;
          line-height: 54px !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          font-variant-numeric: tabular-nums !important;
          box-sizing: border-box !important;
          display: inline-block !important;
          vertical-align: middle !important;
          outline: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: textfield !important;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.2s ease,
                      border-color 0.2s ease,
                      background-color 0.2s ease !important;
        }
        .otp-digit-input::-webkit-outer-spin-button,
        .otp-digit-input::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }
        .otp-digit-input:focus {
          border-color: #6366F1 !important;
          box-shadow: 0 8px 20px -2px rgba(99, 102, 241, 0.35), 0 0 0 3.5px rgba(99, 102, 241, 0.2) !important;
          outline: none !important;
          transform: translateY(-3px) scale(1.06);
          background-color: rgba(99, 102, 241, 0.05) !important;
        }
        .otp-digit-input.has-val {
          border-color: #8B5CF6 !important;
          background-color: rgba(139, 92, 246, 0.08) !important;
          color: #4F46E5 !important;
        }
        .dark .otp-digit-input.has-val {
          color: #C7D2FE !important;
          background-color: rgba(139, 92, 246, 0.14) !important;
        }
        .otp-shake-anim {
          animation: otpErrorShake 0.42s ease-in-out;
        }
      `}</style>

      <div
        className={backdropClass}
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.62)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <div
          className={cardClass}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '440px',
            borderRadius: '24px',
            background: isDark
              ? 'linear-gradient(145deg, #18181B 0%, #0F0F12 100%)'
              : 'linear-gradient(145deg, #FFFFFF 0%, #FAFAFA 100%)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: isDark
              ? '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.06)'
              : '0 25px 60px -15px rgba(99, 102, 241, 0.22), 0 10px 30px rgba(0, 0, 0, 0.08)',
            padding: '34px 28px',
            boxSizing: 'border-box',
          }}
        >
          {/* Prominent Circular Close Button with Clear Cross Icon */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup Modal"
            className="otp-close-btn"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '36px',
              height: '36px',
              minWidth: '36px',
              minHeight: '36px',
              maxWidth: '36px',
              maxHeight: '36px',
              aspectRatio: '1 / 1',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              zIndex: 30,
              background: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F1F5F9',
              border: isDark ? '1.5px solid rgba(255, 255, 255, 0.18)' : '1.5px solid #CBD5E1',
              color: isDark ? '#FFFFFF' : '#0F172A',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              padding: 0,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isDark ? '#FFFFFF' : '#0F172A'}
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: 'block', pointerEvents: 'none' }}
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Header Icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '22px',
                background: isVerified
                  ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: !isVerified ? 'otpBadgePulse 2.8s ease-in-out infinite' : 'none',
              }}
            >
              {isVerified ? (
                <svg
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ animation: 'otpCheckmarkPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              )}
            </div>
          </div>

          {/* Title & Description */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h3
              style={{
                fontSize: '21px',
                fontWeight: '700',
                color: isDark ? '#FFFFFF' : '#111827',
                marginBottom: '8px',
                letterSpacing: '-0.02em',
              }}
            >
              {isVerified ? 'Verifikasi Berhasil!' : 'Verifikasi Akun Anda'}
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                color: isDark ? '#A1A1AA' : '#6B7280',
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Masukkan 6 digit kode OTP yang kami kirimkan ke:
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '6px',
                padding: '4px 12px',
                borderRadius: '8px',
                background: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
                color: isDark ? '#A5B4FC' : '#4F46E5',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              <span>{email || 'email-anda@example.com'}</span>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#EF4444',
                fontSize: '13px',
                lineHeight: 1.4,
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#10B981',
                fontSize: '13px',
                lineHeight: 1.4,
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          {/* 6-Digit OTP Inputs */}
          {!isVerified && (
            <>
              <div
                className={error ? 'otp-shake-anim' : ''}
                style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'center',
                  marginBottom: '24px',
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pastedData = e.clipboardData.getData('text');
                  handlePastedCode(pastedData);
                }}
              >
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className={`otp-digit-input ${digit ? 'has-val' : ''}`}
                    disabled={loading || isVerified}
                    style={{
                      width: '50px',
                      height: '58px',
                      borderRadius: '14px',
                      textAlign: 'center',
                      fontSize: '24px',
                      fontWeight: '700',
                      lineHeight: '54px',
                      padding: 0,
                      margin: 0,
                      color: isDark ? '#FFFFFF' : '#0F172A',
                      background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#F8FAFC',
                      border: isDark ? '1.5px solid rgba(255, 255, 255, 0.16)' : '1.5px solid #CBD5E1',
                      boxSizing: 'border-box',
                      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                ))}
              </div>

              {/* Verify Button */}
              <button
                type="button"
                onClick={() => handleVerify()}
                disabled={loading || otpDigits.join('').length !== 6}
                className="auth-primary-btn"
                style={{
                  width: '100%',
                  padding: '13px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: loading || otpDigits.join('').length !== 6 ? 'not-allowed' : 'pointer',
                  opacity: loading || otpDigits.join('').length !== 6 ? 0.65 : 1,
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                  transition: 'all 0.18s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                {loading ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <span>Verifikasi Sekarang</span>
                )}
              </button>

              {/* Resend OTP countdown / trigger */}
              <div style={{ textAlign: 'center', fontSize: '13px', color: isDark ? '#A1A1AA' : '#6B7280' }}>
                {countdown > 0 ? (
                  <span>
                    Belum menerima kode? Kirim ulang dalam{' '}
                    <strong style={{ color: isDark ? '#FFFFFF' : '#111827' }}>
                      {String(Math.floor(countdown / 60)).padStart(2, '0')}:
                      {String(countdown % 60).padStart(2, '0')}
                    </strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending}
                    className="auth-otp-link"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isDark ? '#818CF8' : '#4F46E5',
                      fontWeight: '600',
                      cursor: resending ? 'not-allowed' : 'pointer',
                      fontSize: '13px',
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                  >
                    {resending ? 'Mengirim ulang...' : 'Kirim Ulang Kode OTP'}
                  </button>
                )}
              </div>
            </>
          )}

          {isVerified && (
            <div style={{ textAlign: 'center', paddingTop: '8px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: isDark ? '#A1A1AA' : '#6B7280',
                  fontSize: '13.5px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                <span>Mempersiapkan akun Anda...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
