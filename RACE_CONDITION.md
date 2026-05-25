**Race Condition: Like/Unlike Đồng Thời**

- **Summary:** Xảy ra khi nhiều user like/unlike cùng lúc dẫn đến giá trị `likeCount` phát tán không nhất quán giữa DB và SSE/HTTP responses.

- **Root Cause:** code trước đây phát emit SSE dựa trên giá trị `post` đã đọc trước transaction (`ensureCanInteractWithPost`) thay vì dùng giá trị trả về từ `prisma.post.update` trong transaction => stale/duplication khi concurrent requests.

- **Observed Symptoms:** nhiều log SSE với `likeCount: 1` xuất hiện rồi cuối cùng `likeCount: 2` (hoặc ngược lại), subscribers nhận payload giống nhau nhiều lần (nhiều kết nối).

- **Fixes Applied:**
  - **Atomically update**: dùng transaction để `create|delete` `like` và `post.update` cùng lúc.
  - **Emit chính xác:** emit SSE sử dụng `likeCount` trả về từ `prisma.post.update` (transaction result).
  - **API response:** `likePost` / `unlikePost` trả luôn `{ liked: boolean, likeCount: number }` dựa trên giá trị cập nhật.
  - **Fallbacks:** khi duplicate like (P2002) hoặc delete-missing (P2025) trả về `likeCount` hiện tại từ DB.

- **Why keep `{ liked: true }`:** HTTP response là ACK cho caller; SSE là broadcast. Giữ cả hai giúp caller cập nhật UI ngay và các subscribers đồng bộ.

- **Recommendations / Next Steps:**
  - Thêm integration test mô phỏng 2 request đồng thời để xác nhận atomicity.
  - (Optional) Nếu cần scale: chuyển increments sang queue/worker (idempotent operations) hoặc dùng row-level DB locks.

- **Files changed:**
  - `src/newsfeed/newsfeed.service.ts` — dùng transaction-updated `likeCount` và trả `likeCount` trong response.

- **Quick reproduce:** gọi đồng thời 2 request POST `/posts/:id/like` từ 2 profile khác nhau; quan sát logs và SSE payloads.
