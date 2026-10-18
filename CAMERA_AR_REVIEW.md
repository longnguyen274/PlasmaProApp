# Camera AR, khoanh vết thương và dán nhãn diện tích

## Cập nhật 13/10/2026: phiên AR thật, bám theo vết thương, đánh giá trước khi chụp

- **Khoanh và bám theo vết thương khi quay** (`src/lib/capture/woundDetect.ts`): dò vùng đỏ hơn da xung quanh trên kênh a* (CIELAB), ngưỡng Otsu, lọc nhiễu, chọn vùng gần giữa khung, lấp lỗ, vẽ viền bao lồi. Khoảng 1 ms/khung 120×160. Đây là bộ dò màu thử nghiệm, không phải mô hình đã huấn luyện; vết thương hoại tử đen hoặc da đỏ toàn vùng có thể không khoanh được.
- **Nguồn khung**: bản cài có AR lấy khung nhỏ từ phiên ARCore/ARKit (~5 khung/giây); Expo Go chụp ảnh nhỏ im lặng (~2–3 khung/giây); web đọc thẳng video.
- **Đánh giá trước khi chụp** (`assessCapture` trong `src/lib/capture/ar.ts`): AR đang theo dõi ổn định, đã khoanh được vết thương, độ sáng đạt (ước lượng ánh sáng AR + độ sáng/chói trong vùng vết thương), khoảng cách tới đúng tâm vết thương 20–60 cm, góc chụp không nghiêng quá ~37°. Với AR, nút chụp chỉ mở khi đạt. Không có AR: chỉ kiểm tra vết thương và độ sáng, có nút "Vẫn chụp".
- **Phiên AR native** (`modules/plasma-ar`): Android dùng ARCore 1.56 (GLSurfaceView, ảnh CPU độ phân giải cao nhất, depth nếu máy hỗ trợ); iPhone dùng ARKit (ARSCNView, sceneDepth nếu có LiDAR). Ảnh lưu kèm nội tham số camera theo ảnh đã lưu, tư thế camera, ma trận view/projection, khoảng cách và pháp tuyến bề mặt tại vết thương, tệp chiều sâu.
- **Ước lượng diện tích AR** (`estimateAreaCm2`): số điểm ảnh vùng khoanh × (Z/fx)·(Z/fy), chia cos góc nghiêng. Lưu ở `automaticMeasurement` với trạng thái `estimated_unvalidated`, điền sẵn để bác sĩ xác nhận hoặc sửa. Số bác sĩ xác nhận là nhãn chuẩn (`areaCm2`, `manualReference`).
- **Sau khi chụp**: khoanh lại trên chính ảnh đã lưu, bác sĩ nhập/xác nhận diện tích và phương pháp, lưu là dán nhãn luôn (tên tệp `..._area_<x>_cm2`).

Đã kiểm tra: TypeScript, ESLint, kiểm thử bộ dò (ảnh tổng hợp + 6 ảnh mẫu), kiểm thử đánh giá trước chụp và công thức diện tích; chạy web với camera giả lập (vết thương di chuyển): viền bám theo, chụp, khoanh trên ảnh, lưu nhãn 12,5 cm². APK Android có module ARCore biên dịch thành công. **Chưa chạy trên điện thoại Android thật; mã ARKit cho iPhone chưa được biên dịch** (cần máy Mac hoặc EAS Build). Ước lượng diện tích AR chưa được kiểm chứng bằng vật mẫu có diện tích biết trước.

---

# Ghi chú trước đó: tài liệu Camera/AR không marker – iPhone 12 Pro

## Bổ sung: hướng dẫn và tự chụp khi giữ yên

Trong màn Chụp có hướng dẫn, mở camera → Bật tự chụp khi giữ yên → xác nhận đã căn đủ vết thương, đủ sáng và nhìn rõ chi tiết. Bộ đếm cần 3 giây liên tục có tín hiệu ổn định; chuyển động, tín hiệu thiếu/cũ hoặc rời màn hình sẽ hủy tiến trình đó. Có thể hủy tự chụp hoặc bấm chụp tay bất kỳ lúc nào. Mỗi lần bật chỉ chụp một ảnh và luôn chuyển sang xem lại, không tự lưu hay tự chia sẻ.

- iOS/Android: dùng `expo-sensors` DeviceMotion (gia tốc không trọng lực và tốc độ quay), có kiểm tra hỗ trợ/quyền. Đây là nhận biết điện thoại ít chuyển động, chưa phát hiện bệnh nhân dịch chuyển hoặc vết thương ra khỏi khung. Người chụp vẫn xác nhận bố cục/ánh sáng; chất lượng ảnh được kiểm tra lại sau chụp.
- Web: so sánh các frame mới ở vùng giữa ảnh, tạm dừng khi tín hiệu cũ, thiếu sáng/quá sáng hoặc ít chi tiết. Ngưỡng thử nghiệm không thay thế kiểm tra bằng mắt, không xác nhận chất lượng lâm sàng.
- Không suy đoán khoảng cách nên chưa nhắc “gần hơn/xa hơn”, không bám đường biên vết thương và không tính cm².
- Lưu cách kích hoạt màn trập (`manual`, `gallery`, `steady_auto`), nguồn theo dõi và thời gian giữ yên riêng với số đo diện tích. Xác nhận trước khi chụp không tự đánh dấu đã kiểm tra ảnh sau chụp.
- Trên iPhone, cho phép truy cập chuyển động nếu được hỏi. Nếu không có quyền hoặc không có tín hiệu, dùng nút Chụp ảnh. Bản cài riêng cần dựng lại để có thông báo quyền tiếng Việt.

API đối chiếu: https://docs.expo.dev/versions/v57.0.0/sdk/devicemotion/

Tài liệu `Plasma_Pro_Tich_hop_Camera_AR_khong_marker.md` phù hợp làm hướng phát triển. Tuy nhiên AR tracking hoặc LiDAR không tự bảo đảm độ chính xác diện tích vết thương. U-Net chỉ phân đoạn; cần tỷ lệ mét và dữ liệu hình học khớp đúng ảnh để chuyển sang cm². Chưa tìm thấy mô hình đã huấn luyện trong dự án.

## Đã triển khai trong bản demo

- Bác sĩ mở chụp có hướng dẫn từ tab chụp hoặc hồ sơ vết thương. Chỉ bác sĩ phụ trách có quyền thêm ảnh.
- Camera sau, khung căn bố cục; tắt preview khi rời màn hình hoặc app xuống nền. Có đường chọn ảnh thư viện khi camera không dùng được.
- Kiểm tra lại ảnh và vùng giữa ảnh đã lưu (nhỏ/vừa/rộng); ảnh gốc không bị cắt. Vùng này không phải mask vết thương. Khung live chỉ là hướng dẫn bố cục, không tuyên bố đã ánh xạ sang ảnh lưu.
- Phân tích sáng và mức chi tiết trên vùng chọn của ảnh thu nhỏ. Web có gợi ý live; iOS phân tích sau chụp. Ngưỡng thử nghiệm chưa hiệu chuẩn theo màu da/mô/vùng cơ thể, không chặn lưu, không bao giờ tuyên bố “đạt chuẩn đo”. Chói và rung giữ `unknown` vì chưa có bộ phát hiện đáng tin cậy.
- Bác sĩ xác nhận bố cục, ánh sáng, nét bằng mắt. Những xác nhận này được giữ cùng ảnh và tách khỏi kết quả thuật toán.
- Nguồn ảnh, kích thước, ID phiên/ảnh, vùng phân tích, kết quả chất lượng và khả năng thiết bị được lưu kèm. Thời điểm chụp thư viện không xác định giữ null; ngày thêm không được trình bày như ngày chụp.
- `manualReference` lưu số đo, phương pháp, bác sĩ và thời điểm xác nhận. `automaticMeasurement.areaCm2`, khoảng cách và geometry luôn null trong bản này. Giá trị 0 chỉ do bác sĩ xác nhận chủ ý.
- Kiểm tra việc lưu dữ liệu trước khi rời màn xem lại; lỗi dung lượng bộ nhớ giữ ảnh ở màn đó để thử lại.
- Mã Swift trong `modules/plasma-ar-capabilities` chỉ kiểm tra khả năng ARKit của thiết bị thực: tracking, scene depth, mesh. Chưa được biên dịch/chạy trên iPhone trong môi trường Windows này. Trong Expo Go module không có, app hiển thị “chưa kiểm tra được”, không suy đoán từ tên máy.

## Phần chưa có và điều kiện để đo AR thật

Chưa có ARSession thu RGB/depth/confidence/intrinsics/pose đồng bộ; chưa có U-Net, giao diện sửa mask, tái dựng mặt cong hay cấu hình đo đã xác thực. Mã kiểm tra điều kiện đo chỉ là nền tảng cho các phần này, không tạo ra phép đo thật.

1. Tạo development build iOS có module native (cần môi trường Xcode/macOS hoặc quy trình build iOS phù hợp). Expo Go/web chỉ dùng để demo luồng chụp.
2. Trên iPhone 12 Pro, kiểm tra hỗ trợ runtime rồi triển khai ARSession; thu ảnh, chiều sâu, confidence, intrinsics, pose và timestamp/ID cùng frame. Mất tracking/đổi phiên phải hủy hình học cũ. Việc mở camera thường không cung cấp các dữ liệu AR này.
3. Tích hợp mô hình phân đoạn đã huấn luyện và để bác sĩ kiểm tra/chỉnh mask. Không lấy khung ROI chữ nhật làm diện tích vết thương.
4. Chọn phương pháp đo thích hợp cho vùng phẳng/cong, kiểm tra vùng có chiều sâu thực, phép chiếu và tỷ lệ mét. Không suy ra cm/pixel bằng một hằng số hoặc ước lượng từ tên điện thoại.
5. Kiểm chứng bằng phantom/tham chiếu độc lập; đo sai số tuyệt đối/tương đối và độ lặp lại theo khoảng cách, góc, ánh sáng, độ cong. Không lấy số đo bác sĩ vừa nhập làm kết quả dự đoán để tự đánh giá mô hình.
6. Chỉ bật trả kết quả cm² trong phạm vi thiết bị/tình huống đã được kiểm chứng. Không dùng khoảng 0,5–5 m của ARCore như khoảng chụp vết thương mặc định.

## Cách demo hiện tại

Chạy `npm start` trong thư mục PlasmaProApp. Dùng web để thử luồng hoặc Expo Go tương thích SDK của dự án trên iPhone để thử camera. Máy tính và điện thoại phải kết nối được với nhau; `localhost` trên điện thoại là chính điện thoại. Nếu Metro đang chạy `--localhost`, khởi động lại bằng chế độ LAN trước khi quét QR. Camera web trên điện thoại cần HTTPS; ưu tiên Expo Go cho demo camera iPhone.

Đăng nhập bác sĩ → Chụp ảnh → chọn bệnh nhân/vết thương → Chụp có hướng dẫn → Mở camera hoặc Chọn ảnh có sẵn → kiểm tra → lưu → Nhập diện tích bác sĩ đã đo → ghi phương pháp đo. Luồng chia sẻ đã được bác sĩ duyệt/đồng ý nghiên cứu vẫn áp dụng; dữ liệu chụp nội bộ không tự được đưa nguyên bản vào ZIP nghiên cứu.

## Nguồn đối chiếu

- Apple iPhone 12 Pro (LiDAR): https://support.apple.com/en-us/111875
- Apple ARKit sceneDepth: https://developer.apple.com/documentation/arkit/arframe/scenedepth
- Expo Camera SDK 57: https://docs.expo.dev/versions/v57.0.0/sdk/camera/
- Expo development builds: https://docs.expo.dev/develop/development-builds/introduction/
- Expo local modules: https://docs.expo.dev/modules/get-started/
- Google ARCore Depth: https://developers.google.com/ar/develop/depth

Đây là demo cục bộ. Chưa xác nhận độ chính xác lâm sàng hay thử nghiệm trực tiếp trên iPhone 12 Pro.

## Kết quả kiểm tra trên máy phát triển

- TypeScript và ESLint đạt.
- Kiểm thử vùng ROI, dữ liệu thiếu, điều kiện đo, frame cũ, quyền truy cập và trường riêng tư trong dữ liệu nghiên cứu đạt.
- Trình duyệt: chọn ảnh, kiểm tra, lưu lỗi hết dung lượng rồi thử lại, tải lại trang và nhập số đo riêng đều đạt. Luồng chụp bằng camera giả lập, camera từ chối quyền và chặn bệnh nhân mở màn chụp đều đạt.
- Metro dựng gói JavaScript iOS thành công. Autolinking nhận được module PlasmaARCapabilities. Các kết quả này chưa phải biên dịch native hoặc thử nghiệm camera/LiDAR trên iPhone thật.
- ZIP có thêm `capture-quality.json` gồm các trường được chọn riêng: nguồn, vùng ảnh, chất lượng thử nghiệm và số đo tham chiếu. Không xuất nguyên metadata nội bộ, thông tin thiết bị, bác sĩ, thời gian hoặc phương pháp đo dạng văn bản tự do.
