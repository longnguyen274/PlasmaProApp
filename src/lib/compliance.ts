// Căn cứ pháp lý áp dụng cho ứng dụng. Mỗi mục có nguồn để tự kiểm tra lại.
// "verified": đã đối chiếu số hiệu, ngày ban hành/hiệu lực với nguồn ngày 12/10/2026.
// Không phải tư vấn pháp lý; nhóm cần đối chiếu văn bản gốc trước khi triển khai thật.

export interface LegalRef {
  id: string;
  title: string;
  issued: string;
  effective?: string;
  issuer: string;
  appliesTo: string;
  inApp: string;
  source: string;
  verified: boolean;
  note?: string;
}

export const LEGAL_GROUPS: { group: string; items: LegalRef[] }[] = [
  {
    group: 'Thiết bị y tế (bao gồm phần mềm)',
    items: [
      {
        id: 'Nghị định 98/2021/NĐ-CP',
        title: 'Về quản lý trang thiết bị y tế',
        issued: '08/11/2021',
        effective: '01/01/2022',
        issuer: 'Chính phủ',
        appliesTo:
          'Điều 2 khoản 1 định nghĩa thiết bị y tế gồm cả phần mềm dùng cho chẩn đoán, theo dõi, điều trị. Máy Plasma Pro là thiết bị y tế; phần mềm điều khiển nguồn, nhận liệu trình có thể bị coi là phụ kiện/phần mềm thiết bị y tế và phải phân loại mức rủi ro.',
        inApp: 'App không tự chẩn đoán hay tự đề xuất liệu trình; điều khiển nguồn cần xác nhận từ thiết bị; ghi rõ dữ liệu mô phỏng.',
        source: 'https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Decree-98-2021-ND-CP-classification-of-medical-devices-495965.aspx',
        verified: true,
        note: 'Đã được sửa đổi bởi Nghị định 07/2023/NĐ-CP (03/03/2023), 96/2023/NĐ-CP, 85/2024/NĐ-CP, 04/2025/NĐ-CP (01/01/2025), 342/2025/NĐ-CP; bản hợp nhất 08/VBHN-BYT xác thực ngày 06/03/2026.',
      },
      {
        id: 'Văn bản hợp nhất 08/VBHN-BYT',
        title: 'Hợp nhất Nghị định về quản lý thiết bị y tế',
        issued: '06/03/2026',
        issuer: 'Bộ Y tế',
        appliesTo: 'Bản hợp nhất mới nhất tìm được của Nghị định 98/2021/NĐ-CP và các nghị định sửa đổi; nên trích dẫn bản này khi viết báo cáo.',
        inApp: '—',
        source: 'https://luatvietnam.vn/y-te/van-ban-hop-nhat-08-vbhn-byt-2026-quan-ly-thiet-bi-y-te-427889-d5.html',
        verified: true,
      },
      {
        id: 'Thông tư 05/2022/TT-BYT',
        title: 'Quy định chi tiết thi hành một số điều của Nghị định 98/2021/NĐ-CP về quản lý trang thiết bị y tế',
        issued: '01/08/2022',
        issuer: 'Bộ Y tế',
        appliesTo: 'Hướng dẫn quy tắc phân loại thiết bị y tế theo mức rủi ro (A, B, C, D). Dùng để xác định mức phân loại của Plasma Pro kèm mô-đun IoMT và phần mềm.',
        inApp: 'Chưa phân loại: việc phân loại do đơn vị có thẩm quyền thực hiện; app không tự kết luận.',
        source: 'https://thuvienphapluat.vn/van-ban/The-thao-Y-te/Thong-tu-05-2022-TT-BYT-huong-dan-Nghi-dinh-98-2021-ND-CP-quan-ly-thiet-bi-y-te-499978.aspx',
        verified: true,
      },
    ],
  },
  {
    group: 'Khám bệnh, chữa bệnh và hồ sơ bệnh án',
    items: [
      {
        id: 'Luật Khám bệnh, chữa bệnh số 15/2023/QH15',
        title: 'Luật Khám bệnh, chữa bệnh',
        issued: '09/01/2023',
        effective: '01/01/2024',
        issuer: 'Quốc hội',
        appliesTo: 'Khung pháp lý cho hoạt động khám chữa bệnh, kể cả khám chữa bệnh từ xa; hồ sơ bệnh án (Điều 2 khoản 17 được Thông tư 13/2025 dẫn chiếu).',
        inApp: 'Mọi nhận định, liệu trình do bác sĩ có thẩm quyền nhập; app chỉ lưu và hiển thị.',
        source: 'https://thuvienphapluat.vn/van-ban/the-thao-y-te/Luat-15-2023-QH15-kham-benh-chua-benh-372143.aspx',
        verified: true,
      },
      {
        id: 'Thông tư 30/2023/TT-BYT',
        title: 'Danh mục bệnh, tình trạng bệnh được khám bệnh, chữa bệnh từ xa',
        issued: '30/12/2023',
        effective: '01/01/2024',
        issuer: 'Bộ Y tế',
        appliesTo: 'Nếu bác sĩ dùng app để tư vấn, điều chỉnh điều trị từ xa, cần đối chiếu tình trạng của bệnh nhân với danh mục 50 bệnh/tình trạng của Thông tư.',
        inApp: 'Màn hình báo triệu chứng nhắc gọi 115 khi khẩn cấp; app không thay thế khám trực tiếp.',
        source: 'https://vbpl.vn/TW/Lists/vbpq/Attachments/178262/30_2023_TT-BYT_593328.doc',
        verified: true,
        note: 'Chưa đối chiếu danh mục có bao gồm vết thương mạn tính hay không.',
      },
      {
        id: 'Thông tư 13/2025/TT-BYT',
        title: 'Hướng dẫn triển khai hồ sơ bệnh án điện tử',
        issued: '06/06/2025',
        effective: '21/07/2025',
        issuer: 'Bộ Y tế',
        appliesTo: 'Áp dụng khi dữ liệu trong app được dùng làm một phần hồ sơ bệnh án điện tử của cơ sở khám chữa bệnh (ký số, lưu trữ, truy vết).',
        inApp: 'Lưu người sửa và thời điểm cho nhãn diện tích, đánh giá, liệu trình; giữ mã ảnh cố định.',
        source: 'https://caselaw.vn/van-ban-phap-luat/587211-thong-tu-so-13-2025-tt-byt-ngay-06-06-2025-cua-bo-truong-bo-y-te-huong-dan-trien-khai-ho-so-benh-an-dien-tu',
        verified: true,
      },
      {
        id: 'Thông tư 54/2017/TT-BYT',
        title: 'Bộ tiêu chí ứng dụng công nghệ thông tin tại các cơ sở khám bệnh, chữa bệnh',
        issued: '29/12/2017',
        effective: '27/02/2018',
        issuer: 'Bộ Y tế',
        appliesTo: 'Tham khảo nhóm tiêu chí phi chức năng, bảo mật và an toàn thông tin khi tích hợp vào hệ thống của bệnh viện.',
        inApp: 'Phân quyền theo vai trò, khóa tài khoản, nhật ký thay đổi.',
        source: 'https://thuvienphapluat.vn/van-ban/Cong-nghe-thong-tin/Thong-tu-54-2017-TT-BYT-Bo-tieu-chi-ung-dung-cong-nghe-thong-tin-tai-cac-co-so-kham-chua-benh-373292.aspx',
        verified: true,
        note: 'Chưa kiểm tra tình trạng hiệu lực hiện tại của từng tiêu chí.',
      },
    ],
  },
  {
    group: 'Dữ liệu y tế và dữ liệu cá nhân',
    items: [
      {
        id: 'Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15',
        title: 'Luật Bảo vệ dữ liệu cá nhân',
        issued: '26/06/2025',
        effective: '01/01/2026',
        issuer: 'Quốc hội',
        appliesTo: 'Ảnh vết thương, triệu chứng, nhật ký điều trị là dữ liệu về tình trạng sức khỏe, thuộc dữ liệu cá nhân nhạy cảm; cần sự đồng ý của chủ thể dữ liệu.',
        inApp: 'Thông báo xử lý dữ liệu khi đăng nhập; đồng ý nghiên cứu riêng cho từng bệnh nhân, rút lại được; xuất dữ liệu chỉ bằng mã hồ sơ.',
        source: 'https://ketoananpha.vn/luat-bao-ve-du-lieu-ca-nhan-nam-2025',
        verified: true,
      },
      {
        id: 'Nghị định 356/2025/NĐ-CP',
        title: 'Quy định chi tiết một số điều và biện pháp thi hành Luật Bảo vệ dữ liệu cá nhân',
        issued: '31/12/2025',
        effective: '01/01/2026',
        issuer: 'Chính phủ',
        appliesTo: 'Điều 4 liệt kê thông tin tình trạng sức khỏe là dữ liệu cá nhân nhạy cảm. Thay thế Nghị định 13/2023/NĐ-CP.',
        inApp: 'Như trên; quản trị kỹ thuật không mặc định xem được dữ liệu lâm sàng.',
        source: 'https://thuvienphapluat.vn/van-ban/Quyen-dan-su/Nghi-dinh-356-2025-ND-CP-huong-dan-Luat-Bao-ve-du-lieu-ca-nhan-687428.aspx',
        verified: true,
      },
      {
        id: 'Nghị định 102/2025/NĐ-CP',
        title: 'Quy định quản lý dữ liệu y tế',
        issued: '13/05/2025',
        issuer: 'Chính phủ',
        appliesTo: 'Quy định xây dựng, bảo vệ, xử lý và sử dụng dữ liệu y tế số. Áp dụng khi hệ thống đưa vào vận hành và kết nối dữ liệu y tế.',
        inApp: 'Dữ liệu demo lưu cục bộ; bản thật cần máy chủ có kiểm soát truy cập.',
        source: 'https://luatvietnam.vn/y-te/nghi-dinh-102-2025-nd-cp-cua-chinh-phu-quy-dinh-quan-ly-du-lieu-y-te-400071-d1.html',
        verified: true,
        note: 'Chưa xác minh được ngày hiệu lực.',
      },
    ],
  },
  {
    group: 'Nghiên cứu và dữ liệu huấn luyện AI',
    items: [
      {
        id: 'Thông tư 43/2024/TT-BYT',
        title: 'Quy định việc thành lập, tổ chức và hoạt động của Hội đồng đạo đức trong nghiên cứu y sinh học',
        issued: '12/12/2024',
        effective: '01/02/2025',
        issuer: 'Bộ Y tế',
        appliesTo: 'Thu thập ảnh bệnh nhân để huấn luyện mô hình là nghiên cứu trên người; đề cương thu thập dữ liệu nên được Hội đồng đạo đức xem xét.',
        inApp: 'Chỉ xuất ảnh của bệnh nhân đã đồng ý; chỉ bác sĩ được cấp quyền nghiên cứu mới xuất được.',
        source: 'https://caselaw.vn/van-ban-phap-luat/413160-thong-tu-so-43-2024-tt-byt-ngay-12-12-2024-cua-bo-truong-bo-y-te-quy-dinh-viec-thanh-lap-to-chuc-va-hoat-dong-cua-hoi-dong-dao-duc-trong-nghien-cuu-y-sinh-hoc',
        verified: true,
      },
    ],
  },
];

/** Tiêu chuẩn phần cứng đã nêu trong slide của đề tài; là tiêu chuẩn IEC, không phải văn bản của Bộ Y tế. */
export const HARDWARE_STANDARDS = ['IEC 60601-1', 'IEC 60601-1-2 (EMC)', 'IEC 60601-1-11 (thiết bị dùng tại nhà)'];
