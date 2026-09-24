export const HTTP_ERROR_MESSAGES: Readonly<Record<number, string>> = {
  400: 'Permintaan tidak valid. Mohon periksa kembali data yang Anda masukkan.',
  401: 'Sesi Anda telah berakhir. Silahkan masuk kembali untuk melanjutkan.',
  403: 'Akun Anda belum diverifikasi atau tidak memiliki akses ke fitur ini.',
  404: 'Data yang Anda cari tidak ditemukan. Pastikan informasi yang dimasukkan sudah benar.',
  409: 'Data sudah terdaftar. Silahkan gunakan informasi lain atau coba masuk.',
  422: 'Format data tidak sesuai. Periksa kembali isian formulir Anda.',
  429: 'Terlalu banyak percobaan. Silahkan tunggu beberapa saat sebelum mencoba lagi.',
  500: 'Terjadi kesalahan pada server. Silahkan coba beberapa saat lagi.',
  502: 'Layanan sedang tidak tersedia. Silahkan coba beberapa saat lagi.',
  503: 'Layanan sedang tidak tersedia. Silahkan coba beberapa saat lagi.',
} as const;

export const NETWORK_ERROR_MESSAGE =
  'Gagal terhubung ke server, Silahkan coba beberapa saat lagi.';

/**
 * Checks whether an error is caused by a network connection failure
 * (e.g. Failed to fetch, offline, connection refused).
 */
export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }
  if (err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch')) {
    return true;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('connection refused') ||
      msg.includes('econnrefused') ||
      msg.includes('networkerror') ||
      msg.includes('fetch failed')
    );
  }
  return false;
}

/**
 * Resolves an HTTP status code to a human-readable, user-friendly message.
 * Falls back to a generic message containing the status code if unmapped.
 */
export function getFriendlyErrorMessage(status: number): string {
  return (
    HTTP_ERROR_MESSAGES[status] ??
    `Terjadi kesalahan yang tidak terduga. Silakan coba lagi. (Kode: ${status})`
  );
}
