# Check Mã Đơn

Check Mã Đơn là một ứng dụng web giúp bạn tải video, quét mã đơn tự động bằng OCR và QR, sau đó xem, sao chép và xuất kết quả ngay trong trình duyệt.

## Tính năng
- Chọn video từ máy và phát trực tiếp trong giao diện
- Quét tự động nhiều khung hình để tăng độ chính xác
- Nhận diện mã bằng BarcodeDetector và OCR
- Hiển thị danh sách mã, chọn từng mã để xem preview QR
- Sao chép và xuất kết quả ra file txt
- Hỗ trợ trợ lý AI nội bộ và OpenAI API key tùy chọn

## Cách sử dụng
1. Mở file index.html trong trình duyệt hoặc chạy một máy chủ tĩnh như Python http.server.
2. Chọn video.
3. Nhấn Bắt đầu quét.
4. Xem danh sách mã, sao chép hoặc xuất kết quả.

## Ghi chú
- Nếu máy không hỗ trợ BarcodeDetector, ứng dụng vẫn cố gắng quét bằng OCR.
- Kết quả được lưu tạm trong bộ nhớ trình duyệt khi dùng OpenAI key.