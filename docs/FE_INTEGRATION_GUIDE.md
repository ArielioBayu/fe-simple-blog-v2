# Frontend Integration Guide & Backend Progress Summary
**Project:** `go-simple-blog-v2`  
**Target Audience:** Frontend Engineers (React, Next.js, Vue, Nuxt, Mobile/Flutter)  
**Base URL Local:** `http://localhost:9888`  
**Status Backend:** Modular Feature-First Architecture, Enterprise-Tested, Production-Ready  

---

## 1. Ringkasan Kemajuan & Peningkatan Backend (Progress Overview)

Backend ini telah mengalami peningkatan besar dalam hal performa, keamanan, standardisasi, dan keandalan arsitektur:

1. **Migrasi Arsitektur Modular (Feature-First ala Komite Etik)**:
   - Kode dipartisi ke dalam modul-modul independen: [`auth`](file:///c:/Data/Project%20Golang/go-simple-blog-v2/internal/modules/auth), [`user`](file:///c:/Data/Project%20Golang/go-simple-blog-v2/internal/modules/user), [`post`](file:///c:/Data/Project%20Golang/go-simple-blog-v2/internal/modules/post), [`comment`](file:///c:/Data/Project%20Golang/go-simple-blog-v2/internal/modules/comment), dan [`activity`](file:///c:/Data/Project%20Golang/go-simple-blog-v2/internal/modules/activity).
   - Menggunakan *Dependency Injection* dan *Container Registries* (`Repositories`, `Services`, `Handlers`, `Router`) sehingga minim coupling dan mudah dimaintain.
2. **Dual Authentication Support (Header + HttpOnly Cookie)**:
   - Mendukung autentikasi via header `Authorization: Bearer <token>` **DAN** cookie aman `access_token` (`HttpOnly`, `SameSite=Lax`, `Max-Age=24h`).
   - Frontend web dapat memanfaatkan cookie otomatis tanpa risiko pencurian token via XSS (*Cross-Site Scripting*).
3. **Standarisasi Kontrak Respons API**:
   - Semua respons API konsisten menggunakan struktur `DataResponse`, `PaginationResponse`, atau `MessageResponse`.
4. **Optimasi Database & Performa Tinggi**:
   - **Like System Bebas Race Condition**: Query like/unlike menggunakan atomic `INSERT ... ON DUPLICATE KEY UPDATE` di level database MySQL. Aman terhadap klik cepat / spam like dari user (*concurrency safe*).
   - **Pencarian Refresh Token Instan O(log N)**: Kolom `refresh_token` diindeks `UNIQUE KEY VARCHAR(255)`, menghilangkan *Full Table Scan*.
   - **Auto Purge on Login**: Token kedaluwarsa otomatis dibersihkan setiap kali user login sehingga tabel database tidak membengkak (*no table bloat*).
   - **Production Connection Pooling**: Konfigurasi koneksi MySQL (`MaxOpenConns=25`, `MaxIdleConns=25`, `MaxLifetime=15m`, `MaxIdleTime=5m`).
5. **Kualitas Kode Standar Industri (Enterprise-Grade Tests)**:
   - Dilengkapi *Table-Driven Unit & HTTP Handler Tests* dengan assertion library `testify`.
   - Lulus pengujian 100% dengan *coverage* yang solid.

---

## 2. Format Standar Respons API

Seluruh endpoint backend mengembalikan format JSON yang terstandarisasi:

### A. Format Respons Data Tunggal / Objek (`DataResponse`)
Digunakan saat mengambil detail entitas atau data proses berhasil:
```json
{
  "status": 200,
  "message": "success get post",
  "data": {
    "id": 1,
    "post_title": "Belajar Golang Modern",
    "post_content": "Konten artikel...",
    "post_hashtags": ["golang", "backend"],
    "is_liked": true,
    "created_at": "2026-09-14 10:00:00",
    "updated_at": "2026-09-14 10:00:00"
  }
}
```

### B. Format Respons Pagination / List (`PaginationResponse`)
Digunakan pada endpoint daftar data yang mendukung pembagian halaman:
```json
{
  "status": 200,
  "message": "success get all post",
  "pagination": {
    "limit": 10,
    "offset": 0
  },
  "data": [
    {
      "id": 1,
      "user_id": 2,
      "username": "bayu",
      "post_title": "Judul Post",
      "post_content": "Isi post...",
      "post_hashtags": ["tech", "golang"],
      "is_liked": false,
      "created_at": "2026-09-14 09:30:00",
      "updated_at": "2026-09-14 09:30:00"
    }
  ]
}
```

### C. Format Respons Pesan / Error (`MessageResponse`)
Digunakan saat operasi CRUD aksi (create/update/delete) atau saat terjadi error:
```json
{
  "status": 400,
  "message": "Invalid password"
}
```

---

## 3. Mekanisme Autentikasi & Refresh Token (Sangat Penting untuk FE)

Backend menyediakan dua cara pengiriman token:

1. **Metode Cookie (Sangat Direkomendasikan untuk Web Browser)**:
   - Saat login (`/memberships/sign-in`), backend otomatis mengirim header:
     ```http
     Set-Cookie: access_token=<jwt_token>; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax
     ```
   - **Frontend Cukup**: Mengaktifkan opsi `withCredentials: true` (pada Axios) atau `credentials: 'include'` (pada Fetch). Browser akan otomatis menyertakan cookie ini di setiap request berikutnya!
2. **Metode Authorization Header (Untuk Mobile App / SSR / Jamstack)**:
   - Frontend dapat membaca `data.access_token` dari respons login dan menyimpannya di memory atau secure storage, lalu mengirimkannya via header:
     ```http
     Authorization: Bearer <access_token>
     ```

### Alur Kerja Refresh Token (Silent Refresh):
1. Token akses (`access_token`) berlaku selama **24 Jam**.
2. Refresh token (`refresh_token`) berlaku selama **7 Hari**.
3. Jika request mendapatkan status **`401 Unauthorized`**, Frontend memanggil `POST /memberships/refresh` dengan payload:
   ```json
   {
     "token": "<refresh_token>"
   }
   ```
4. Backend akan mengembalikan `access_token` baru (dan memperbarui cookie secara otomatis).
5. Frontend mengulang kembali request yang sebelumnya gagal (*retry failed request*).

---

## 4. Katalog Endpoint & Spesifikasi API

### A. Modul Autentikasi & Akun (`/memberships`)

#### 1. Registrasi Pengguna (`Sign Up`)
- **Endpoint:** `POST /memberships/sign-up`
- **Auth:** Publik
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "username": "userkeren",
    "password": "Password123!"
  }
  ```
- **Response Success (`201 Created`):**
  ```json
  {
    "status": 201,
    "message": "success created data"
  }
  ```
- **Response Errors:**
  - `400 Bad Request`: Format JSON tidak valid / field kosong.
  - `409 Conflict`: Username atau Email sudah terdaftar sebelumnya.

---

#### 2. Masuk Pengguna (`Sign In`)
- **Endpoint:** `POST /memberships/sign-in`
- **Auth:** Publik
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
- **Response Success (`200 OK`):**
  *(Sekaligus men-set cookie `access_token` di browser)*
  ```json
  {
    "status": 200,
    "message": "Success Login",
    "data": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "d8f3a9e2-b1c4-4d8e-9f0a-1b2c3d4e5f6a"
    }
  }
  ```
- **Response Errors:**
  - `400 Bad Request`: Password salah (`ErrInvalidPassword`).
  - `404 Not Found`: Email tidak ditemukan di database (`ErrDataNotFound`).

---

#### 3. Perbarui Access Token (`Refresh Token`)
- **Endpoint:** `POST /memberships/refresh`
- **Auth:** Publik
- **Request Body:**
  ```json
  {
    "token": "d8f3a9e2-b1c4-4d8e-9f0a-1b2c3d4e5f6a"
  }
  ```
- **Response Success (`200 OK`):**
  ```json
  {
    "status": 200,
    "message": "success refresh token",
    "data": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
  ```
- **Response Errors:**
  - `401 Unauthorized`: Token sudah kedaluwarsa atau tidak valid / tidak cocok.
  - `404 Not Found`: Token tidak ditemukan di database.

---

#### 4. Ambil Profil Pengguna Saat Ini (`Get User Profile`)
- **Endpoint:** `GET /memberships/get-user`
- **Auth:** Wajib Login (`Cookie` atau `Bearer Token`)
- **Response Success (`200 OK`):**
  ```json
  {
    "status": 200,
    "message": "success get data",
    "data": {
      "id": 1,
      "username": "userkeren",
      "email": "user@example.com",
      "created_at": "2026-09-14T08:00:00Z"
    }
  }
  ```
- **Response Errors:**
  - `401 Unauthorized`: Token tidak disertakan atau sudah kedaluwarsa.
  - `404 Not Found`: User ID pada token tidak ada di database.

---

### B. Modul Postingan Blog (`/posts`)

#### 1. Buat Postingan Baru (`Create Post`)
- **Endpoint:** `POST /posts/create-post`
- **Auth:** Wajib Login
- **Request Body:**
  ```json
  {
    "post_title": "Panduan Integrasi Backend dan Frontend 2026",
    "post_content": "Artikel ini menjelaskan secara lengkap bagaimana menghubungkan Next.js dengan Golang Gin...",
    "post_hashtags": ["golang", "nextjs", "webdev"]
  }
  ```
- **Response Success (`201 Created`):**
  ```json
  {
    "status": 201,
    "message": "Success Create Post"
  }
  ```
- **Catatan Frontend:** `post_hashtags` berupa array string. Backend otomatis menyimpannya ke database dan mengembalikannya dalam bentuk array saat di-fetch.

---

#### 2. Ambil Semua Postingan (`Get All Posts - Pagination`)
- **Endpoint:** `GET /posts/get-all-post`
- **Auth:** Wajib Login (diperlukan untuk mengetahui apakah user yang sedang login sudah me-like postingan tersebut atau belum)
- **Query Parameters:**
  - `pageIndex` *(integer, default: 1)*: Halaman yang ingin diambil (1-based).
  - `pageSize` *(integer, default: 10)*: Jumlah postingan per halaman.
  - *Contoh URL:* `/posts/get-all-post?pageIndex=1&pageSize=10`
- **Response Success (`200 OK`):**
  ```json
  {
    "status": 200,
    "message": "success get all post",
    "pagination": {
      "limit": 10,
      "offset": 0
    },
    "data": [
      {
        "id": 5,
        "user_id": 1,
        "username": "userkeren",
        "post_title": "Panduan Integrasi Backend dan Frontend 2026",
        "post_content": "Artikel ini menjelaskan secara lengkap...",
        "post_hashtags": ["golang", "nextjs", "webdev"],
        "is_liked": true,
        "created_at": "2026-09-14 10:15:00",
        "updated_at": "2026-09-14 10:15:00"
      }
    ]
  }
  ```
- **Tips Frontend:** Nilai boolean `is_liked` dapat langsung digunakan untuk mewarnai tombol ikon hati (*Heart icon* aktif/tidak) pada kartu postingan.

---

#### 3. Ambil Detail Postingan Berdasarkan ID (`Get Post by ID`)
- **Endpoint:** `GET /posts/get-post-by-id/:postId`
- **Auth:** Wajib Login
- **URL Parameter:** `postId` *(integer)*
- **Response Success (`200 OK`):**
  ```json
  {
    "status": 200,
    "message": "success get post",
    "data": {
      "detail_post": {
        "id": 5,
        "user_id": 1,
        "username": "userkeren",
        "post_title": "Panduan Integrasi Backend dan Frontend 2026",
        "post_content": "Artikel ini menjelaskan secara lengkap...",
        "post_hashtags": ["golang", "nextjs", "webdev"],
        "is_liked": true,
        "created_at": "2026-09-14 10:15:00",
        "updated_at": "2026-09-14 10:15:00"
      },
      "liked_count": 42,
      "comments": [
        {
          "id": 12,
          "user_id": 2,
          "username": "budi_santoso",
          "comment_content": "Artikel yang sangat informatif, terima kasih!"
        }
      ]
    }
  }
  ```
- **Response Errors:**
  - `400 Bad Request`: Parameter `postId` bukan angka.
  - `404 Not Found`: Post dengan ID tersebut tidak ditemukan.

---

### C. Modul Komentar (`/posts/create-comment/:postId`)

#### 1. Tambah Komentar pada Post (`Create Comment`)
- **Endpoint:** `POST /posts/create-comment/:postId`
- **Auth:** Wajib Login
- **URL Parameter:** `postId` *(integer)*
- **Request Body:**
  ```json
  {
    "comment_content": "Keren sekali penjelasannya!"
  }
  ```
- **Response Success (`201 Created`):**
  ```json
  {
    "status": 201,
    "message": "success create comment"
  }
  ```
- **Response Errors:**
  - `400 Bad Request`: `postId` tidak valid atau body kosong.
  - `404 Not Found`: Post ID tidak ditemukan.

---

### D. Modul Interaksi & Like (`/posts/user-activity/:postId`)

#### 1. Like / Unlike Postingan (`Toggle Like Activity`)
- **Endpoint:** `POST /posts/user-activity/:postId`
- **Auth:** Wajib Login
- **URL Parameter:** `postId` *(integer)*
- **Request Body:**
  ```json
  {
    "is_liked": true
  }
  ```
  *(Kirim `"is_liked": false` untuk membatalkan like/unlike)*
- **Response Success (`200 OK`):**
  ```json
  {
    "status": 200,
    "message": "success"
  }
  ```
- **Keunggulan untuk FE:** Endpoint ini bersifat **idempotent** dan menggunakan MySQL Atomic Upsert. Jika user menekan tombol like berulang kali secara cepat, backend tidak akan error dan tidak akan terjadi duplikasi data.

---

## 5. Panduan Implementasi Frontend (Contoh Kode Siap Pakai)

### A. Konfigurasi Axios Client (`apiClient.ts` / `apiClient.js`)

Gunakan konfigurasi Axios berikut untuk menangani pengiriman cookie dan mekanisme **Automatic Silent Refresh Token**:

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:9888',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Wajib agar browser otomatis mengirim dan menerima cookie
});

// Interceptor Response untuk Silent Refresh Token otomatis
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Jika response 401 dan bukan request refresh token itu sendiri
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/memberships/refresh')) {
      originalRequest._retry = true;

      try {
        const storedRefreshToken = localStorage.getItem('refresh_token');
        if (!storedRefreshToken) {
          // Arahkan ke halaman login jika tidak ada refresh token
          window.location.href = '/login';
          return Promise.reject(error);
        }

        // Panggil endpoint refresh token
        const refreshResponse = await axios.post(
          `${apiClient.defaults.baseURL}/memberships/refresh`,
          { token: storedRefreshToken },
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.data.access_token;
        
        // Update header untuk request yang diulang
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        // Eksekusi ulang request awal yang sempat gagal
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh token kedaluwarsa -> bersihkan sesi & redirect ke login
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

---

### B. Contoh Service Calls Frontend

```typescript
import apiClient from './apiClient';

// 1. Sign In
export const login = async (email: string, password: string) => {
  const response = await apiClient.post('/memberships/sign-in', { email, password });
  // Simpan refresh token untuk silent refresh
  if (response.data.data.refresh_token) {
    localStorage.setItem('refresh_token', response.data.data.refresh_token);
  }
  return response.data;
};

// 2. Fetch All Posts with Pagination
export const fetchPosts = async (pageIndex = 1, pageSize = 10) => {
  const response = await apiClient.get('/posts/get-all-post', {
    params: { pageIndex, pageSize },
  });
  return response.data;
};

// 3. Toggle Like with Optimistic UI Update
export const toggleLike = async (postId: number, isLiked: boolean) => {
  const response = await apiClient.post(`/posts/user-activity/${postId}`, {
    is_liked: isLiked,
  });
  return response.data;
};

// 4. Create Comment
export const addComment = async (postId: number, commentContent: string) => {
  const response = await apiClient.post(`/posts/create-comment/${postId}`, {
    comment_content: commentContent,
  });
  return response.data;
};
```

---

## 6. Daftar Status HTTP & Penanganannya di Frontend

| HTTP Status | Arti | Rekomendasi Aksi di Frontend |
| :--- | :--- | :--- |
| **`200 OK`** | Permintaan berhasil (GET, PUT, POST aksi). | Render data ke UI. |
| **`201 Created`** | Data berhasil dibuat (Sign Up, Create Post, Create Comment). | Tampilkan notifikasi sukses (Toast/Alert), refresh list. |
| **`400 Bad Request`** | Input validasi gagal atau format JSON keliru. | Tampilkan pesan `message` dari backend di bawah field form. |
| **`401 Unauthorized`** | Token kedaluwarsa atau belum login. | Lakukan silent refresh, jika gagal redirect ke `/login`. |
| **`404 Not Found`** | Data postingan/user tidak ditemukan. | Tampilkan halaman 404 atau pesan "Data tidak ditemukan". |
| **`409 Conflict`** | Email/Username sudah dipakai user lain. | Informasikan user untuk menggunakan email/username lain. |
| **`500 Internal Server Error`**| Kendala pada server backend/database. | Tampilkan pesan fallback: *"Terjadi kendala pada server, silakan coba beberapa saat lagi"*. |

---

## 7. Rangkuman Check-list untuk Frontend Developer
- [ ] Set `withCredentials: true` pada HTTP client (Axios/Fetch).
- [ ] Simpan `refresh_token` ke `localStorage` / Secure Storage saat login berhasil.
- [ ] Implementasikan Axios Interceptor untuk otomatis me-refresh token saat menerima respons `401`.
- [ ] Manfaatkan field boolean `is_liked` dari endpoint `/posts/get-all-post` dan `/posts/get-post-by-id/:postId` untuk status tombol like.
- [ ] Gunakan fitur *Optimistic UI Update* saat memanggil `/posts/user-activity/:postId` agar pengalaman klik like instan tanpa delay jaringan.
