# Panduan Kebutuhan Fitur & Spesifikasi API Backend (Golang)
**Project Target:** `go-simple-blog-v2`  
**Dibuat Untuk:** Backend Developer / Fullstack Engineer  
**Referensi Arsitektur:** Modular Feature-First Architecture (Go Standard)  
**Status:** Rancangan Kebutuhan Menyeluruh (Roadmap & API Specification)

---

## 1. Ringkasan Eksekutif

Aplikasi frontend (`frontend-simple-blog-v2`) telah mengadopsi estetika modern bergaya **Instagram/Threads** dengan sistem interaksi sosial (Feed, Story, Profil Kreator, Like instan, Bookmark/Saved, Komentar, dan Filter Hashtag).

Saat ini, sebagian fitur masih berjalan di sisi client (*mock data* atau *localStorage* browser), seperti:
1. **Bookmark / Koleksi Tersimpan**: Tersimpan di `localStorage` (`saved_posts`).
2. **Statistik Profil & Bio**: Angka stories dihitung manual di UI, bio masih hardcoded.
3. **Story Bar**: Menggunakan data mock channel tag.
4. **Trending Tags**: Diekstrak manual dari list postingan yang dimuat di memori browser.
5. **Pencarian & Filter Tag**: Difilter di browser tanpa server-side search.

Dokumen ini menyajikan **rancangan kebutuhan API secara lengkap, skema database MySQL, kontrak request/response JSON, serta prioritas pengerjaan** agar backend Golang dapat melengkapi seluruh kebutuhan frontend dengan mulus.

---

## 2. Matriks Prioritas Pengerjaan

| Level | Fitur | Alasan / Urgensi |
| :--- | :--- | :--- |
| **P0 (Urgent)** | **Saved / Bookmark Posts API** | Menghubungkan fitur simpan yang saat ini masih di `localStorage`. |
| **P0 (Urgent)** | **User Profile Stats & Update Profile** | Menampilkan bio, avatar, dan angka statistik (Stories, Saved, Likes) secara dinamis dari database. |
| **P1 (High)** | **Server-side Search & Tag Filtering** | Pencarian artikel skala besar dan list tag populer tanpa membebani browser. |
| **P1 (High)** | **Post Media / Image Upload** | Instagram blog sangat membutuhkan visual gambar pada artikel. |
| **P1 (High)** | **Comment Management (Delete & Reply)** | Fitur moderasi komentar milik sendiri. |
| **P2 (Social)** | **Follow / Unfollow System** | Menghubungkan ekosistem sosial kreator dan pembaca. |
| **P2 (Social)** | **Instagram Stories (24 Jam)** | Media story berdurasi 24 jam dengan avatar ring gradient. |
| **P3 (Extra)** | **Notifikasi Interaksi (In-App Notifications)** | Pemberitahuan saat artikel di-like atau dikomentari. |

---

## 3. Skema Database MySQL (DDL)

Berikut rekomendasi tabel baru dan perubahan kolom yang perlu ditambahkan pada database MySQL `go-simple-blog-v2`:

```sql
-- ============================================================
-- 1. Penambahan Kolom pada Tabel USERS / MEMBERSHIPS
-- ============================================================
ALTER TABLE users 
ADD COLUMN bio VARCHAR(255) DEFAULT 'Creator & Storyteller on SimpleBlog' AFTER email,
ADD COLUMN avatar_url VARCHAR(500) NULL AFTER bio,
ADD COLUMN banner_url VARCHAR(500) NULL AFTER avatar_url;

-- ============================================================
-- 2. Penambahan Kolom Gambar pada Tabel POSTS
-- ============================================================
ALTER TABLE posts 
ADD COLUMN image_url VARCHAR(500) NULL AFTER post_content;

-- ============================================================
-- 3. Tabel BOOKMARK / SAVED POSTS (P0)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_saved_posts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    post_id BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_post_saved (user_id, post_id),
    INDEX idx_user_saved (user_id),
    INDEX idx_post_saved (post_id),
    CONSTRAINT fk_saved_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_saved_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Tabel FOLLOWERS & FOLLOWING (P2)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_follows (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    follower_id BIGINT NOT NULL, -- User yang mem-follow
    following_id BIGINT NOT NULL, -- User yang di-follow
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_follower_following (follower_id, following_id),
    INDEX idx_follower (follower_id),
    INDEX idx_following (following_id),
    CONSTRAINT fk_follow_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_follow_following FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Tabel INSTAGRAM STORIES (24 Jam Auto-Expire) (P2)
-- ============================================================
CREATE TABLE IF NOT EXISTS stories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    caption VARCHAR(255) NULL,
    expires_at TIMESTAMP NOT NULL, -- Otomatis diset created_at + 24 jam
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_story_user (user_id),
    INDEX idx_story_expires (expires_at),
    CONSTRAINT fk_story_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. Tabel NOTIFIKASI (P3)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,       -- Penerima notifikasi
    actor_id BIGINT NOT NULL,      -- Pelaku (yang like/komen/follow)
    action_type ENUM('LIKE', 'COMMENT', 'FOLLOW') NOT NULL,
    entity_id BIGINT NULL,         -- post_id jika LIKE/COMMENT
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notif_user (user_id, is_read),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. Spesifikasi Endpoint API Lengkap

Setiap respons API wajib mematuhi standar JSON yang telah ada di backend:
```json
{
  "status": 200,
  "message": "pesan keberhasilan",
  "data": { ... }
}
```

---

### Modul 1: Bookmark / Saved Posts (Prioritas P0)

#### A. Toggle Bookmark (Simpan / Hapus Simpan Postingan)
- **Method & Path**: `POST /posts/user-saved/:postId`
- **Auth**: Wajib (`Authorization: Bearer <token>` atau Cookie `access_token`)
- **Request Body**:
  ```json
  {
    "is_saved": true
  }
  ```
- **Logika Backend**:
  - Jika `is_saved: true`: jalankan `INSERT IGNORE INTO user_saved_posts (user_id, post_id) VALUES (?, ?)`.
  - Jika `is_saved: false`: jalankan `DELETE FROM user_saved_posts WHERE user_id = ? AND post_id = ?`.
- **Response Success (200 OK)**:
  ```json
  {
    "status": 200,
    "message": "success update saved post status",
    "data": {
      "post_id": 14,
      "is_saved": true
    }
  }
  ```

#### B. Ambil Daftar Postingan Tersimpan (Saved Collection)
- **Method & Path**: `GET /posts/saved?page=1&limit=10`
- **Auth**: Wajib
- **Response Success (200 OK)**:
  ```json
  {
    "status": 200,
    "message": "success get saved posts",
    "data": [
      {
        "id": 14,
        "user_id": 2,
        "username": "johndoe",
        "post_title": "Belajar Golang Microservices",
        "post_content": "Konten artikel...",
        "image_url": "https://images.unsplash.com/photo-...",
        "post_hashtags": ["golang", "microservices"],
        "like_count": 12,
        "is_liked": true,
        "is_saved": true,
        "created_at": "2026-09-14 10:30:00"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total_page": 1,
      "total_data": 1
    }
  }
  ```

#### C. Ambil Daftar ID Postingan Tersimpan (Untuk Status Feed Instan)
- **Method & Path**: `GET /posts/saved/ids`
- **Auth**: Wajib
- **Response Success (200 OK)**:
  ```json
  {
    "status": 200,
    "message": "success get saved post ids",
    "data": [14, 28, 45]
  }
  ```

---

### Modul 2: Profil & Statistik Dinamis (Prioritas P0)

Saat ini frontend memerlukan angka statistik untuk kartu profil di sidebar:
- **Stories**: Jumlah artikel yang pernah dibuat user.
- **Saved**: Jumlah artikel yang disimpan user.
- **Likes**: Total like yang diterima oleh postingan-postingan milik user.

#### A. Get User Profile Lengkap & Statistik
- **Method & Path**: `GET /memberships/profile` *(atau update `GET /memberships/get-user`)*
- **Auth**: Wajib
- **Query Database**:
  ```sql
  SELECT 
    u.id, u.username, u.email, u.bio, u.avatar_url, u.created_at,
    (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS stories_count,
    (SELECT COUNT(*) FROM user_saved_posts WHERE user_id = u.id) AS saved_count,
    (SELECT COALESCE(SUM(like_count), 0) FROM posts WHERE user_id = u.id) AS likes_count,
    (SELECT COUNT(*) FROM user_follows WHERE following_id = u.id) AS followers_count,
    (SELECT COUNT(*) FROM user_follows WHERE follower_id = u.id) AS following_count
  FROM users u WHERE u.id = ?;
  ```
- **Response Success (200 OK)**:
  ```json
  {
    "status": 200,
    "message": "success get user profile",
    "data": {
      "id": 1,
      "username": "bpti",
      "email": "bpti@example.com",
      "bio": "Creator & Storyteller on SimpleBlog",
      "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=bpti",
      "created_at": "2026-09-01T08:00:00Z",
      "stats": {
        "stories_count": 5,
        "saved_count": 12,
        "likes_count": 87,
        "followers_count": 142,
        "following_count": 68
      }
    }
  }
  ```

#### B. Update User Profile
- **Method & Path**: `PUT /memberships/profile`
- **Auth**: Wajib
- **Request Body**:
  ```json
  {
    "username": "bpti_official",
    "bio": "Software Engineer & Tech Blogger",
    "avatar_url": "https://res.cloudinary.com/.../profile.jpg"
  }
  ```
- **Response Success (200 OK)**:
  ```json
  {
    "status": 200,
    "message": "profile updated successfully",
    "data": {
      "id": 1,
      "username": "bpti_official",
      "bio": "Software Engineer & Tech Blogger",
      "avatar_url": "https://res.cloudinary.com/.../profile.jpg"
    }
  }
  ```

---

### Modul 3: Server-side Search & Trending Tags (Prioritas P1)

#### A. Filter Postingan Berdasarkan Tag & Kata Kunci Pencarian
- **Method & Path**: `GET /posts?tag=golang&search=microservice&page=1&limit=10`
- **Auth**: Opsional (jika login, sertakan `is_liked` dan `is_saved` dari user tersebut)
- **Response Success (200 OK)**: Format `PaginationResponse` standar.

#### B. Ambil Daftar Trending Hashtags
- **Method & Path**: `GET /posts/trending-tags?limit=10`
- **Auth**: Publik
- **Deskripsi**: Menghitung hashtag yang paling sering muncul dari tabel postingan.
- **Response Success (200 OK)**:
  ```json
  {
    "status": 200,
    "message": "success get trending tags",
    "data": [
      { "tag": "golang", "post_count": 24 },
      { "tag": "nextjs", "post_count": 18 },
      { "tag": "webdev", "post_count": 15 },
      { "tag": "technology", "post_count": 9 }
    ]
  }
  ```

---

### Modul 4: Upload Media / Gambar (Prioritas P1)

Untuk mendukung postingan bergaya visual Instagram:

- **Method & Path**: `POST /upload`
- **Auth**: Wajib
- **Content-Type**: `multipart/form-data`
- **Form Data**:
  - `file`: File gambar (jpg, png, webp, max 5MB).
- **Logika Backend**:
  - Validasi tipe MIME file.
  - Simpan ke folder server `./uploads/` (atau direct upload ke Cloudinary / AWS S3).
- **Response Success (201 Created)**:
  ```json
  {
    "status": 201,
    "message": "file uploaded successfully",
    "data": {
      "url": "http://localhost:9888/uploads/posts/2026-09-14-abc1234.webp"
    }
  }
  ```

---

### Modul 5: Instagram Stories 24 Jam (Prioritas P2)

Fitur story dengan durasi tayang 24 jam:

#### A. Create Story Baru
- **Method & Path**: `POST /stories`
- **Auth**: Wajib
- **Request Body**:
  ```json
  {
    "media_url": "http://localhost:9888/uploads/stories/story-123.jpg",
    "caption": "Working on Golang v2!"
  }
  ```
- **Logika Backend**: Kolom `expires_at` otomatis diisi `NOW() + INTERVAL 24 HOUR`.

#### B. Ambil Active Stories Feed
- **Method & Path**: `GET /stories`
- **Auth**: Opsional / Wajib
- **Logika Backend**:
  ```sql
  SELECT s.id, s.media_url, s.caption, s.created_at, s.expires_at,
         u.id AS user_id, u.username, u.avatar_url
  FROM stories s
  JOIN users u ON s.user_id = u.id
  WHERE s.expires_at > NOW()
  ORDER BY s.created_at DESC;
  ```

---

### Modul 6: Follow & Suggested Users (Prioritas P2)

#### A. Follow / Unfollow User Toggle
- **Method & Path**: `POST /users/:targetUserId/follow`
- **Auth**: Wajib
- **Request Body**:
  ```json
  {
    "is_follow": true
  }
  ```

#### B. Rekomendasi Kreator (Suggested Creators)
- **Method & Path**: `GET /users/suggested?limit=5`
- **Auth**: Wajib / Opsional
- **Response Success (200 OK)**:
  ```json
  {
    "status": 200,
    "message": "success get suggested users",
    "data": [
      {
        "id": 4,
        "username": "sarah_tech",
        "bio": "Golang & Cloud enthusiast",
        "avatar_url": "https://api.dicebear.com/7.x/avataaars/svg?seed=sarah",
        "followers_count": 320,
        "is_following": false
      }
    ]
  }
  ```

---

## 5. Rekomendasi Struktur Package di Backend Golang

Mengikuti arsitektur *Feature-First* yang telah berjalan di `go-simple-blog-v2`:

```text
internal/modules/
├── auth/            # Sign-in, sign-up, refresh token
├── user/            # Profile, update bio/avatar, stats
│   ├── handler.go   # GetProfile, UpdateProfile
│   ├── service.go   # Business logic profile & stats calculation
│   └── repository.go# Queries user stats, bio update
├── post/            # Post CRUD, like, server-side search
│   ├── handler.go   # ListPosts, CreatePost, SearchPosts
│   ├── service.go   
│   └── repository.go
├── saved/           # Modul Baru: Bookmark / Saved Posts (P0)
│   ├── handler.go   # ToggleSaved, GetSavedPosts, GetSavedIds
│   ├── service.go   
│   └── repository.go
├── story/           # Modul Baru: Instagram Stories (P2)
│   ├── handler.go   # CreateStory, GetActiveStories
│   ├── service.go   
│   └── repository.go
└── upload/          # Modul Baru: Media & Image Upload (P1)
    ├── handler.go   # HandleImageUpload
    └── service.go   
```

---

## 6. Langkah Implementasi yang Disarankan

1. **Tahap 1 (Hari 1 - Urgent P0)**:
   - Buat tabel `user_saved_posts`.
   - Implementasikan endpoint `POST /posts/user-saved/:postId` dan `GET /posts/saved/ids`.
   - Update `GET /memberships/get-user` atau buat `GET /memberships/profile` untuk menyertakan `stats` (`stories_count`, `saved_count`, `likes_count`).
   - *Hasil:* Fitur Bookmark dan Profil di frontend langsung 100% online ke database MySQL!

2. **Tahap 2 (Hari 2 - Media & Search P1)**:
   - Tambahkan handler `POST /upload` untuk upload gambar artikel.
   - Tambahkan query parameter `?tag=` dan `?search=` pada `GET /posts/`.
   - Implementasikan endpoint `GET /posts/trending-tags`.

3. **Tahap 3 (Hari 3 - Social Graph P2)**:
   - Buat tabel `user_follows` dan endpoint follow/unfollow.
   - Buat modul `stories` untuk feed story 24 jam.
