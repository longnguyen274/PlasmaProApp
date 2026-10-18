# ĐẶC TẢ YÊU CẦU TỔNG THỂ ỨNG DỤNG PLASMA PRO

Phiên bản: 1.0 — Ngày lập: 13/10/2026  
Mục đích: Làm cơ sở cho phần phân tích yêu cầu, thiết kế và đánh giá kết quả trong báo cáo đồ án.

## 1. Mục tiêu và phạm vi

Plasma Pro là ứng dụng hỗ trợ quản lý và theo dõi vết thương trong hệ thống IoMT có thiết bị Plasma Pro. Ứng dụng tổ chức thông tin giữa bệnh nhân, bác sĩ và bộ phận kỹ thuật, giúp theo dõi hồ sơ, lịch trình, hình ảnh vết thương, số đo diện tích và lịch sử sử dụng thiết bị.

Ứng dụng hướng tới ba mục tiêu chính:

1. Hỗ trợ bác sĩ quản lý đồng thời nhiều bệnh nhân, ghi nhận hình ảnh và theo dõi diễn biến vết thương.
2. Giúp bệnh nhân theo dõi lịch trình, hướng dẫn của bác sĩ, thiết bị được gán và mức độ tình trạng vết thương.
3. Chuẩn hóa dữ liệu ảnh cùng nhãn diện tích để phục vụ nghiên cứu và phát triển mô hình xử lý ảnh.

Phạm vi hiện tại là bản demo ứng dụng với dữ liệu lưu cục bộ và thiết bị mô phỏng. Xác thực máy chủ, đồng bộ nhiều thiết bị, kết nối phần cứng thật và đo diện tích tự động bằng AR/AI thuộc phần phát triển tiếp.

Các yêu cầu dưới đây mô tả hành vi cần có của hệ thống. Mức độ đáp ứng của bản demo được trình bày riêng tại mục 9; không mặc định mọi yêu cầu đã được triển khai đầy đủ.

## 2. Đối tượng sử dụng và phân quyền

| Tác nhân | Nhu cầu và quyền nghiệp vụ |
|---|---|
| Bệnh nhân | Xem hồ sơ của mình, kết quả bác sĩ đã công bố, lịch trình, thiết bị và lịch sử sử dụng; gửi mô tả triệu chứng hoặc sự cố; quản lý đồng ý nghiên cứu. |
| Bác sĩ | Quản lý bệnh nhân được phân công; tạo hồ sơ vết thương; chụp hoặc tải ảnh; nhập số đo; đánh giá mức độ; lập liệu trình và hướng dẫn; duyệt ảnh trước khi chia sẻ nghiên cứu. |
| Nhân sự kỹ thuật/nghiên cứu | Xem và tải bộ dữ liệu đủ điều kiện, đã giảm thông tin định danh; không mặc nhiên được xem hồ sơ lâm sàng, sửa đánh giá hoặc thay đổi liệu trình. |
| Quản trị hệ thống | Duyệt và khóa tài khoản, phân công bác sĩ, cấp quyền nghiên cứu, quản lý việc đăng ký/gán thiết bị và theo dõi lỗi hệ thống. |

Về nghiệp vụ, kỹ thuật/nghiên cứu và quản trị là hai nhóm trách nhiệm khác nhau. Trong bản demo, hai nhóm được biểu diễn bằng vai trò tài khoản quản trị và quyền nghiên cứu cấp riêng. Khi triển khai thật, cần phân tách quyền chi tiết ở phía máy chủ.

Một bác sĩ có thể phụ trách nhiều bệnh nhân. Tại một thời điểm, một hồ sơ bệnh nhân được gán cho một bác sĩ phụ trách. Bệnh nhân không có quyền chụp/tải ảnh vào hồ sơ, nhập diện tích, thay đổi mức độ vết thương hoặc sửa liệu trình.

## 3. Quy trình nghiệp vụ tổng quát

1. Người dùng đăng ký hoặc kích hoạt tài khoản, đồng ý điều khoản và đăng nhập.
2. Hồ sơ bệnh nhân được tạo và phân công cho bác sĩ phụ trách.
3. Bác sĩ tạo hồ sơ từng vết thương, ghi vị trí và trạng thái theo dõi.
4. Bác sĩ chọn đúng bệnh nhân và vết thương, chụp ảnh có hướng dẫn hoặc chọn ảnh có sẵn.
5. Bác sĩ xem lại ảnh, lưu vào hồ sơ, nhập diện tích đã đo và phương pháp đo.
6. Bác sĩ ghi đánh giá mức độ, diễn biến, hướng dẫn và lịch tái đánh giá; lựa chọn nội dung công bố cho bệnh nhân.
7. Bệnh nhân theo dõi lịch trình, thiết bị và kết quả; gửi phản ánh khi cần.
8. Khi có đồng ý nghiên cứu và ảnh được bác sĩ duyệt, hệ thống đưa bản sao phù hợp vào kho dữ liệu kỹ thuật.
9. Nhân sự được cấp quyền lọc và tải bộ dữ liệu để phục vụ nghiên cứu.

## 4. Yêu cầu chức năng

### 4.1. Tài khoản, đăng nhập và điều khoản

- **FR-01 — Đăng ký, đăng nhập, đăng xuất:** Hệ thống cho phép tạo tài khoản và đăng nhập bằng tên đăng nhập, mật khẩu; kiểm tra dữ liệu đầu vào và thông báo lỗi dễ hiểu.
- **FR-02 — Kích hoạt tài khoản bệnh nhân:** Khi bác sĩ tạo hồ sơ kèm tài khoản, bệnh nhân sử dụng mã kích hoạt để thiết lập mật khẩu. Mã phải có thời hạn, giới hạn số lần thử và không tái sử dụng sau khi kích hoạt thành công.
- **FR-03 — Duyệt tài khoản và phân quyền:** Tài khoản bác sĩ/kỹ thuật mới cần được duyệt. Tài khoản bị khóa hoặc chưa được duyệt không được thực hiện chức năng được bảo vệ. Quyền nghiên cứu được cấp riêng.
- **FR-04 — Chấp thuận điều khoản:** Người dùng phải xác nhận điều khoản sử dụng và chính sách quyền riêng tư theo luồng của ứng dụng. Hệ thống lưu phiên bản điều khoản và thời điểm chấp thuận.
- **FR-05 — Đồng ý nghiên cứu:** Sự đồng ý sử dụng ảnh cho nghiên cứu phải độc lập với điều khoản sử dụng. Bệnh nhân có thể từ chối hoặc rút đồng ý mà vẫn sử dụng chức năng theo dõi.

### 4.2. Hồ sơ bệnh nhân và vết thương

- **FR-06 — Quản lý nhiều bệnh nhân:** Bác sĩ xem danh sách bệnh nhân phụ trách, tìm kiếm theo tên/mã và lọc theo mức độ tình trạng.
- **FR-07 — Hồ sơ bệnh nhân:** Lưu mã hồ sơ, thông tin cơ bản, bác sĩ phụ trách, thiết bị được gán và trạng thái đồng ý nghiên cứu.
- **FR-08 — Hồ sơ vết thương:** Một bệnh nhân có thể có nhiều vết thương. Mỗi vết thương có mã riêng, vị trí, ngày bắt đầu theo dõi và trạng thái đang theo dõi, tạm dừng hoặc kết thúc.
- **FR-09 — Lịch sử theo dõi:** Tập hợp ảnh, số đo, đánh giá và hướng dẫn theo từng vết thương. Hỗ trợ xem ảnh trước/sau và biểu đồ diện tích khi dữ liệu đủ điều kiện.

### 4.3. Thu nhận ảnh có hướng dẫn và tự chụp

- **FR-10 — Thu nhận ảnh theo hồ sơ:** Chỉ bác sĩ phụ trách được chụp hoặc tải ảnh. Trước khi thu nhận, phải xác định đúng bệnh nhân và vết thương.
- **FR-11 — Hướng dẫn căn khung:** Màn hình camera hiển thị khung căn và hướng dẫn đặt toàn bộ vết thương trong ảnh, giữ máy ổn định, đủ sáng và tránh thông tin nhận dạng.
- **FR-12 — Tự chụp khi giữ yên:** Bác sĩ chủ động bật tự chụp và xác nhận đã căn vùng chụp. Khi tín hiệu hỗ trợ cho thấy ổn định liên tục trong 3 giây, ứng dụng chụp một ảnh. Phát hiện chuyển động hoặc thiếu tín hiệu phải dừng/đếm lại; người dùng có thể hủy hoặc chụp tay.
- **FR-13 — Quản lý vòng đời camera:** Khi rời màn hình hoặc ứng dụng xuống nền, phải dừng camera và tiến trình tự chụp. Không tiếp tục dùng kết quả đếm của phiên trước.
- **FR-14 — Xem lại và kiểm tra ảnh:** Sau khi chụp/chọn ảnh, hệ thống cho phép xem lại, chọn vùng phân tích chất lượng, nhận gợi ý sáng/nét và xác nhận bằng mắt. Ảnh chưa đạt vẫn có thể được giữ để theo dõi, nhưng phải giữ trạng thái kiểm tra tương ứng.
- **FR-15 — Phân biệt nguồn ảnh:** Lưu nguồn camera/thư viện, kích thước và cách chụp tay/tự động. Nếu chưa biết ngày chụp gốc, phải thể hiện là chưa xác định; không coi ngày tải lên là ngày chụp.
- **FR-16 — Lưu ảnh và xử lý lỗi:** Ảnh chỉ được lưu sau thao tác xác nhận. Nếu lưu thất bại, hệ thống phải thông báo và cho phép thử lại. Chụp ảnh không đồng nghĩa tự lưu, tự gán nhãn hoặc tự chia sẻ nghiên cứu.

Khung căn là công cụ hỗ trợ bố cục, không phải đường biên phân đoạn vết thương. Tự chụp dựa trên tín hiệu ổn định không có nghĩa hệ thống đã xác nhận độ chính xác của phép đo.

### 4.4. Gán diện tích và chuẩn hóa nhãn

- **FR-17 — Nhập diện tích:** Bác sĩ nhập số đo tham chiếu và phương pháp đo. Đơn vị lưu thống nhất là cm²; có thể hỗ trợ quy đổi đầu vào mm².
- **FR-18 — Kiểm tra số đo:** Từ chối số âm hoặc giá trị không hợp lệ. Chưa có số đo phải được lưu là thiếu dữ liệu; giá trị 0 chỉ được chấp nhận khi bác sĩ xác nhận có chủ ý.
- **FR-19 — Mã ảnh và tên tệp:** Mỗi ảnh có mã ổn định. Tên tệp được tạo từ mã bệnh nhân, mã vết thương, mã ảnh, diện tích và đơn vị. Tên tệp và nhãn số đo phải nhất quán khi cập nhật/xuất.
- **FR-20 — Lịch sử sửa nhãn:** Lưu người sửa, thời điểm và giá trị trước/sau. Thay đổi nhãn không được làm thay đổi nội dung ảnh gốc. Ảnh có thể được đánh dấu chưa có nhãn, đã có nhãn hoặc bị loại kèm lý do.

Ví dụ tên ảnh trong hồ sơ: `BN001_VT01_IMG0007_area_13.2_cm2.jpg`. Khi xuất nghiên cứu, mã hồ sơ lâm sàng được thay bằng mã nghiên cứu.

### 4.5. Đánh giá mức độ và theo dõi diễn biến

- **FR-21 — Ba mức tình trạng:** Bác sĩ lựa chọn một trong ba mức **Nhẹ, Trung bình, Nặng** cho lần đánh giá. Hệ thống không tự suy ra mức độ từ diện tích hoặc từ việc bệnh nhân sử dụng thiết bị.
- **FR-22 — Nội dung đánh giá:** Lưu ngày đánh giá, bác sĩ, ảnh liên quan nếu có, đặc điểm vết thương, triệu chứng và nguồn thông tin, hướng dẫn cùng lịch tái đánh giá.
- **FR-23 — Diễn biến:** Ghi nhận cải thiện, ổn định, xấu đi hoặc chưa đủ dữ liệu. Diễn biến là thông tin khác với mức độ Nhẹ/Trung bình/Nặng.
- **FR-24 — Công bố kết quả:** Bác sĩ quyết định đánh giá nào hiển thị cho bệnh nhân. Bệnh nhân chỉ xem nội dung đã công bố và không được sửa nội dung chuyên môn.

### 4.6. Liệu trình, lịch trình và phản ánh của bệnh nhân

- **FR-25 — Quản lý liệu trình:** Bác sĩ lập và xác nhận liệu trình, gồm khoảng thời gian áp dụng, số phiên dự kiến/ngày, khoảng cách tối thiểu giữa các phiên, lịch tái đánh giá và ghi chú. Các thông số do bác sĩ thiết lập, ứng dụng không tự kê liệu trình.
- **FR-26 — Phiên bản liệu trình:** Mỗi lần cập nhật cần lưu phiên bản, người sửa, thời điểm và lý do. Bệnh nhân xem liệu trình đã xác nhận đang áp dụng.
- **FR-27 — Theo dõi lịch:** Bệnh nhân xem lịch theo ngày, mục tiêu sử dụng và lịch hẹn/tái đánh giá. Nếu chưa có giờ cụ thể hoặc chưa có liệu trình, giao diện phải thể hiện đúng trạng thái đó.
- **FR-28 — Nhắc lịch:** Hỗ trợ hiển thị nhắc lịch trong ứng dụng và thông báo cục bộ khi nền tảng cho phép, người dùng đã cấp quyền. Khi không có quyền, lịch vẫn phải xem được trong ứng dụng.
- **FR-29 — Báo triệu chứng/sự cố:** Bệnh nhân gửi mô tả triệu chứng hoặc lỗi thiết bị; có thể bổ sung mức đau tự báo cáo. Bác sĩ phụ trách xem và đánh dấu đã xử lý.
- **FR-30 — Báo cáo theo dõi:** Cho phép người có quyền tạo báo cáo tổng hợp từ dữ liệu được phép truy cập, hỗ trợ in hoặc xuất/chia sẻ theo nền tảng. Báo cáo hồ sơ và bộ dữ liệu nghiên cứu là hai đầu ra khác nhau.

### 4.7. Thiết bị và nhật ký sử dụng

- **FR-31 — Quản lý thiết bị:** Đăng ký thiết bị, gán cho bệnh nhân và hiển thị mã, loại thiết bị, phiên bản phần mềm, trạng thái kết nối và thời điểm đồng bộ gần nhất.
- **FR-32 — Nhật ký phiên:** Mỗi phiên có mã định danh, thời điểm bắt đầu, thời lượng, kết quả và nguồn dữ liệu. Dữ liệu mô phỏng, nhập tay và thiết bị gửi phải được phân biệt.
- **FR-33 — Thống kê và dữ liệu thiếu:** Tổng hợp số phiên/thời gian sử dụng, loại bản ghi trùng mã phiên và phân biệt “không sử dụng” với “chưa nhận được dữ liệu”. Chỉ số tuân thủ không được trình bày như kết luận về tình trạng vết thương.
- **FR-34 — Điều khiển theo quyền:** Nếu có chức năng gửi lệnh, phải xác nhận thao tác và kiểm tra quyền. Trạng thái chỉ chuyển sang hoàn tất khi nhận được phản hồi thiết bị; mất kết nối không được báo thành công.
- **FR-35 — Kết nối thật:** Ở giai đoạn tích hợp phần cứng, dữ liệu và lệnh phải đi qua cơ chế xác thực, đồng bộ và xác nhận phù hợp. Bản demo hiện chỉ mô phỏng hành vi này.

### 4.8. Dữ liệu nghiên cứu và quản trị

- **FR-36 — Điều kiện vào kho:** Ảnh chỉ được đưa vào kho nghiên cứu khi bệnh nhân còn đồng ý, ảnh do bác sĩ thu nhận, đã có diện tích hợp lệ, không bị loại và được bác sĩ duyệt chia sẻ.
- **FR-37 — Giảm thông tin định danh:** Tạo bản sao nghiên cứu, dùng mã nghiên cứu, loại thông tin liên hệ và metadata không cần thiết. Bác sĩ phải kiểm tra nội dung ảnh để tránh mặt, giấy tờ hoặc dấu hiệu nhận dạng.
- **FR-38 — Xem và xuất dữ liệu:** Nhân sự có quyền nghiên cứu được lọc, xem ảnh và tải ZIP gồm ảnh, `labels.csv`, `capture-quality.json` và tài liệu mô tả. Nhãn diện tích phải khớp ảnh.
- **FR-39 — Rút chia sẻ:** Khi bệnh nhân rút đồng ý hoặc ảnh bị thu hồi duyệt, ảnh không còn đủ điều kiện hiển thị/xuất trong kho. Các tệp đã tải xuống trước đó không thể tự thu hồi.
- **FR-40 — Quản trị:** Hỗ trợ duyệt/khóa tài khoản, phân công bác sĩ, cấp/thu hồi quyền nghiên cứu, gán thiết bị và theo dõi lỗi đồng bộ theo phạm vi được cấp.

Mã nghiên cứu và việc bỏ metadata giúp giảm khả năng nhận dạng, nhưng không chứng minh ảnh đã ẩn danh tuyệt đối. Bộ dữ liệu demo phải được phân biệt với dữ liệu nghiên cứu thu thập thực tế.

## 5. Dữ liệu và quy tắc nghiệp vụ

### 5.1. Nhóm dữ liệu chính

| Nhóm dữ liệu | Nội dung trọng tâm |
|---|---|
| Tài khoản | Vai trò, trạng thái duyệt/khóa, thông tin xác thực, chấp thuận điều khoản, quyền nghiên cứu. |
| Bệnh nhân | Mã hồ sơ, thông tin cơ bản, bác sĩ phụ trách, đồng ý nghiên cứu. |
| Vết thương | Mã, vị trí, ngày bắt đầu và trạng thái theo dõi. |
| Ảnh và thông tin chụp | Mã ảnh, nguồn, tệp gốc, ngày chụp nếu biết, vùng kiểm tra, chất lượng và cách kích hoạt chụp. |
| Nhãn diện tích | Giá trị, đơn vị, phương pháp, người xác nhận và lịch sử sửa. |
| Đánh giá | Mức độ, diễn biến, triệu chứng, hướng dẫn, lịch tái đánh giá và trạng thái công bố. |
| Liệu trình | Thông số do bác sĩ nhập, thời gian, phiên bản và trạng thái xác nhận. |
| Thiết bị/phiên sử dụng | Thiết bị được gán, trạng thái kết nối, mã phiên, thời lượng và nguồn bản ghi. |
| Phản ánh/lỗi | Nội dung, thời điểm, người/hồ sơ liên quan và trạng thái xử lý. |

### 5.2. Quy tắc bắt buộc

1. Mỗi ảnh thuộc đúng một vết thương và một hồ sơ bệnh nhân; mã ảnh không đổi khi sửa nhãn.
2. Thiếu dữ liệu phải thể hiện là chưa xác định, không tự thay bằng 0, bình thường hoặc đã đạt.
3. Mức độ do bác sĩ xác nhận; dữ liệu cũ thiếu mức độ không được tự gán.
4. Ảnh chưa rõ ngày chụp không được dùng như một mốc ngày chụp xác định trên biểu đồ hoặc để tự lùi lịch theo dõi.
5. Số đo bác sĩ và kết quả thuật toán phải là hai trường dữ liệu riêng.
6. Sửa nhãn ảnh phải yêu cầu xét duyệt lại trước khi chia sẻ nghiên cứu.
7. Phân chia train/validation/test của bộ dữ liệu cần theo bệnh nhân/mã nghiên cứu, tránh ảnh cùng bệnh nhân xuất hiện ở nhiều tập.
8. Nhãn diện tích của cả ảnh không thay thế nhãn phân đoạn ở mức pixel; huấn luyện mô hình phân đoạn cần thêm mask phù hợp.

## 6. Yêu cầu phi chức năng

| Mã | Yêu cầu |
|---|---|
| NFR-01 — Khả dụng | Giao diện tiếng Việt, bố cục ưu tiên điện thoại, chữ dễ đọc, thao tác chính rõ ràng; duy trì ngôn ngữ thiết kế và bộ font thống nhất. |
| NFR-02 — Phản hồi | Hiển thị trạng thái đang mở camera, phân tích, lưu hoặc xuất dữ liệu. Các tác vụ xử lý không được làm người dùng hiểu nhầm đã hoàn tất. |
| NFR-03 — Tin cậy | Không tạo ảnh/phiên trùng khi bấm lặp; tự chụp chỉ kích hoạt một lần; lỗi lưu cho phép thử lại và không báo thành công sai. |
| NFR-04 — Toàn vẹn | Bảo đảm liên kết đúng hồ sơ–vết thương–ảnh, nhất quán tên tệp/nhãn, bảo toàn ảnh gốc và truy vết thay đổi quan trọng. |
| NFR-05 — Bảo mật triển khai thật | Xác thực và kiểm tra quyền ở máy chủ, bảo vệ phiên đăng nhập, truyền dữ liệu có bảo vệ và lưu thông tin xác thực bằng cơ chế chuyên dụng; không chỉ dựa vào việc ẩn nút trên giao diện. |
| NFR-06 — Quyền riêng tư | Giới hạn dữ liệu theo nhiệm vụ; tách dữ liệu lâm sàng khỏi bộ xuất nghiên cứu; lưu và áp dụng trạng thái đồng ý. |
| NFR-07 — Tương thích | Kiểm tra khả năng camera/cảm biến theo thiết bị và quyền được cấp. Khi thiếu tính năng, cho phép đường thao tác phù hợp và không giả lập kết quả đo thật. |
| NFR-08 — Bảo trì | Phân tách giao diện, nghiệp vụ, dữ liệu và xử lý ảnh; có kiểm thử cho phân quyền, nhãn, đồng ý nghiên cứu, tự chụp và điều kiện đo. |

Các chỉ tiêu định lượng về hiệu năng và độ chính xác đo phải được xác lập bằng kế hoạch thử nghiệm và dữ liệu thực tế; tài liệu này không công bố một tỷ lệ chính xác khi chưa đo kiểm.

## 7. Yêu cầu mở rộng AR/AI không marker

Mục tiêu mở rộng là hỗ trợ ước lượng diện tích vết thương mà không cần vật chuẩn ngoài trong luồng chụp. Thiết bị dự kiến thử nghiệm là iPhone 12 Pro, nhưng việc có phần cứng hỗ trợ không thay thế kiểm tra khả năng runtime và kiểm chứng phép đo.

- **AR-01:** Kiểm tra khả năng AR, chiều sâu và quyền truy cập trên thiết bị thực.
- **AR-02:** Thu ảnh và dữ liệu hình học đồng bộ, gồm chiều sâu, thông số camera, tư thế và định danh/thời điểm frame cần thiết.
- **AR-03:** Tích hợp mô hình phân đoạn đã huấn luyện; cho phép bác sĩ kiểm tra và chỉnh đường biên/mask.
- **AR-04:** Tính diện tích từ mask và thông tin tỷ lệ/hình học hợp lệ; không sử dụng hằng số cm/pixel tùy ý.
- **AR-05:** Chỉ trả kết quả khi điều kiện ảnh, tracking, căn chỉnh, phạm vi đo và cấu hình kiểm chứng đều đáp ứng. Thiếu dữ liệu phải trả trạng thái chưa đủ điều kiện.
- **AR-06:** Không ghép dữ liệu AR đang có với ảnh thư viện hoặc frame thuộc phiên khác.
- **AR-07:** Lưu riêng diện tích tự động và số đo tham chiếu, kèm nguồn và phương pháp.
- **AR-08:** Đánh giá sai số và độ lặp lại trên dữ liệu/tham chiếu độc lập trước khi công bố độ chính xác hoặc phạm vi sử dụng.

## 8. Tiêu chí nghiệm thu

| Mã | Tình huống và kết quả mong đợi |
|---|---|
| AT-01 | Chưa đồng ý điều khoản: hệ thống không hoàn tất thao tác yêu cầu chấp thuận và chỉ rõ thông tin cần bổ sung. |
| AT-02 | Bệnh nhân truy cập hồ sơ khác hoặc màn chụp: bị từ chối; không thể sửa số đo, mức độ hay liệu trình. |
| AT-03 | Bác sĩ quản lý nhiều bệnh nhân: tìm/lọc được danh sách của mình; không sửa hồ sơ không được phân công. |
| AT-04 | Bật tự chụp nhưng chưa xác nhận khung: không chụp. Khi tín hiệu hợp lệ ổn định 3 giây: chụp đúng một ảnh và mở màn xem lại. |
| AT-05 | Phát hiện chuyển động, mất tín hiệu, bấm hủy hoặc rời màn hình: tiến trình cũ không được tự hoàn tất chụp. |
| AT-06 | Nhập 12,5 cm² hoặc 1250 mm²: giá trị lưu tương ứng 12.5 cm²; dữ liệu thiếu không bị đổi thành 0. |
| AT-07 | Bác sĩ công bố mức Trung bình: bệnh nhân thấy đúng kết quả; đánh giá chưa công bố không xuất hiện. |
| AT-08 | Thiết bị gửi lại cùng mã phiên: chỉ tính một phiên. Mất đồng bộ không bị kết luận là bệnh nhân không sử dụng. |
| AT-09 | Ảnh thiếu đồng ý nghiên cứu, chưa có nhãn hoặc chưa được duyệt: không nằm trong bộ xuất. |
| AT-10 | ZIP hợp lệ: ảnh và nhãn khớp nhau; không xuất tên, số điện thoại, mã hồ sơ lâm sàng hoặc metadata nội bộ ngoài danh sách cho phép. |
| AT-11 | Lưu ảnh thất bại: không báo đã lưu và cho phép thử lại. Chụp tay trong lúc tự chụp không tạo hai ảnh. |
| AT-12 | Không có dữ liệu AR/mô hình/cấu hình hợp lệ: hiển thị chưa đủ dữ liệu, không tự tạo diện tích cm². |

Các tiêu chí này là cơ sở nghiệm thu, không phải tuyên bố toàn bộ đã được kiểm chứng trên thiết bị thật.

## 9. Phạm vi kết quả hiện tại và phần cần phát triển

| Hạng mục | Tình trạng hiện tại |
|---|---|
| Đăng nhập/đăng ký, kích hoạt, điều khoản, phân vai trò | Có trong demo; xác thực, dữ liệu và kiểm tra quyền đang ở phía ứng dụng/cục bộ. |
| Hồ sơ, nhiều bệnh nhân, ảnh, nhãn diện tích, mức độ và lịch trình | Có trong demo. |
| Chụp có hướng dẫn và tự chụp 3 giây | Đã có mã và kiểm thử luồng web/camera giả lập; đường cảm biến có kiểm thử bằng dữ liệu giả lập, cần thử iPhone thật. |
| Gợi ý sáng/nét | Có kiểm tra vùng ảnh với ngưỡng thử nghiệm; iPhone kiểm tra ảnh sau chụp, web có thêm theo dõi preview. |
| Kho nghiên cứu và ZIP | Có luồng duyệt, điều kiện đồng ý, mã nghiên cứu, ảnh PNG và thông tin nhãn/chất lượng đã chọn lọc. |
| Nhắc lịch cục bộ, in/xuất báo cáo | Đã có mã chức năng; cần kiểm thử đầy đủ quyền, lịch chạy và đầu ra trên từng nền tảng. |
| Nhật ký và điều khiển thiết bị | Đang mô phỏng; chưa xác nhận kết nối ESP32/thiết bị Plasma Pro thật. |
| Máy chủ và đồng bộ nhiều máy | Chưa triển khai. Đăng nhập trên hai thiết bị không đồng nghĩa chúng dùng chung dữ liệu. |
| Quét AR, U-Net và diện tích tự động | Chưa triển khai đầy đủ; chưa có phép đo tự động đã kiểm chứng. |
| An toàn/bảo mật vận hành và đánh giá lâm sàng | Chưa được xác nhận cho sử dụng thực tế. |

**Cách mô tả kết quả trong báo cáo:** Đồ án đã xây dựng bản demo ứng dụng hỗ trợ quản lý bệnh nhân, thu nhận ảnh có hướng dẫn, ghi nhận số đo và đánh giá của bác sĩ, theo dõi lịch trình/thiết bị mô phỏng và tổ chức bộ dữ liệu phục vụ nghiên cứu. Đo diện tích tự động bằng AR/AI và kết nối thiết bị thật được xác định là hướng phát triển tiếp theo.

---

**Cơ sở tổng hợp:** Các yêu cầu người dùng đã thống nhất và mã nguồn hiện tại trong các nhóm tài khoản, hồ sơ, camera, cảm biến, nhãn, đánh giá, lịch trình, thiết bị, kho nghiên cứu và báo cáo. Các ghi chú README cũ về chưa có nhắc lịch/xuất báo cáo không được dùng để phủ nhận phần mã đã bổ sung; trạng thái thực tế của các chức năng đó được ghi rõ trong bảng trên.

