

import {
  GoogleGenAI,
  GenerateContentResponse,
  Content,
  Part,
  GenerateContentParameters,
  GroundingChunk,
} from "@google/genai";
import { DocumentAnalysisResult, ChatMessage, ChatMessageAttachment, ChatGenerationContent, NewsArticle } from "../types";


const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("API_KEY is not configured in environment variables. Gemini API calls will fail if an API Key is not provided.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });
const modelName = 'gemini-2.5-flash-preview-04-17';

export type AnalysisInput = string | {
  url?: string;
  base64Data?: string;
  mimeType?: string;
  fileName?: string;
};

// --- START: Legal Document Text ---

const LUAT_BAN_HANH_VBQPPL_TEXT = `
QUỐC HỘI
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
Luật số: 64/2025/QH15
LUẬT
BAN HÀNH VĂN BẢN QUY PHẠM PHÁP LUẬT
Căn cứ Hiến pháp nước Cộng hòa xã hội chủ nghĩa Việt Nam;
Quốc hội ban hành Luật Ban hành văn bản quy phạm pháp luật.
Chương I
NHỮNG QUY ĐỊNH CHUNG
Điều 1. Phạm vi điều chỉnh
Luật này quy định về xây dựng, ban hành văn bản quy phạm pháp luật; nội
dung cơ bản về tổ chức thi hành văn bản quy phạm pháp luật.
Luật này không quy định về làm Hiến pháp, sửa đổi Hiến pháp.
Điều 2. Văn bản quy phạm pháp luật
Văn bản quy phạm pháp luật là văn bản có chứa quy phạm pháp luật, được
ban hành đúng thẩm quyền, hình thức, trình tự, thủ tục theo quy định của Luật
này.
Điều 3. Giải thích từ ngữ
Trong Luật này, các từ ngữ dưới đây được hiểu như sau:
1. Quy phạm pháp luật là quy tắc xử sự chung, có hiệu lực bắt buộc chung,
được áp dụng đối với cơ quan, tổ chức, cá nhân, trong phạm vi cả nước hoặc
trong đơn vị hành chính nhất định, do cơ quan nhà nước, người có thẩm quyền
quy định tại Luật này ban hành và được Nhà nước bảo đảm thực hiện.
2. Chính sách là tập hợp các giải pháp cụ thể của Nhà nước để giải quyết
một hoặc một số vấn đề của thực tiễn nhằm đạt được mục tiêu nhất định, phù
hợp với chủ trương, đường lối của Đảng.
3. Tham vấn chính sách là việc trao đổi trực tiếp giữa cơ quan lập đề xuất
chính sách với cơ quan, tổ chức, cá nhân được tham vấn theo quy định của Luật
này nhằm lựa chọn giải pháp, hoàn thiện chính sách của dự án luật, nghị quyết
của Quốc hội, pháp lệnh của Ủy ban Thường vụ Quốc hội.
4. Đánh giá tác động của chính sách là việc phân tích, dự báo khả năng ảnh
hưởng của từng giải pháp nhằm lựa chọn phương án tối ưu, phù hợp với mục
tiêu của chính sách.
5. Rà soát văn bản quy phạm pháp luật là việc xem xét, đối chiếu, đánh giá
các quy định của văn bản được rà soát nhằm phát hiện, xử lý hoặc kiến nghị xử
lý các quy định mâu thuẫn, chồng chéo, hết hiệu lực hoặc không còn phù hợp.
6. Kiểm tra văn bản quy phạm pháp luật là việc xem xét, đánh giá, kết luận
về tính hợp hiến, tính hợp pháp, tính thống nhất với hệ thống pháp luật của văn
bản được kiểm tra.
Điều 4. Hệ thống văn bản quy phạm pháp luật
1. Hiến pháp.
2. Bộ luật, luật (sau đây gọi chung là luật), nghị quyết của Quốc hội.
3. Pháp lệnh, nghị quyết của Ủy ban Thường vụ Quốc hội; nghị quyết liên
tịch giữa Ủy ban Thường vụ Quốc hội với Đoàn Chủ tịch Ủy ban Trung ương
Mặt trận Tổ quốc Việt Nam; nghị quyết liên tịch giữa Ủy ban Thường vụ Quốc
hội, Chính phủ với Đoàn Chủ tịch Ủy ban Trung ương Mặt trận Tổ quốc Việt
Nam.
4. Lệnh, quyết định của Chủ tịch nước.
5. Nghị định, nghị quyết của Chính phủ; nghị quyết liên tịch giữa Chính
phủ với Đoàn Chủ tịch Ủy ban Trung ương Mặt trận Tổ quốc Việt Nam.
6. Quyết định của Thủ tướng Chính phủ.
7. Nghị quyết của Hội đồng Thẩm phán Tòa án nhân dân tối cao.
8. Thông tư của Chánh án Tòa án nhân dân tối cao; thông tư của Viện
trưởng Viện kiểm sát nhân dân tối cao; thông tư của Bộ trưởng, Thủ trưởng cơ
quan ngang Bộ; thông tư của Tổng Kiểm toán nhà nước.
9. Thông tư liên tịch giữa Chánh án Tòa án nhân dân tối cao, Viện trưởng
Viện kiểm sát nhân dân tối cao, Tổng Kiểm toán nhà nước, Bộ trưởng, Thủ
trưởng cơ quan ngang Bộ.
10. Nghị quyết của Hội đồng nhân dân tỉnh, thành phố trực thuộc trung
ương (sau đây gọi chung là cấp tỉnh).
11. Quyết định của Ủy ban nhân dân cấp tỉnh.
12. Văn bản quy phạm pháp luật của chính quyền địa phương ở đơn vị
hành chính - kinh tế đặc biệt.
13. Nghị quyết của Hội đồng nhân dân huyện, quận, thị xã, thành phố thuộc
tỉnh, thành phố thuộc thành phố trực thuộc trung ương (sau đây gọi chung là cấp
huyện).
14. Quyết định của Ủy ban nhân dân cấp huyện.
Điều 5. Nguyên tắc xây dựng, ban hành văn bản quy phạm pháp luật
1. Bảo đảm sự lãnh đạo toàn diện, trực tiếp của Đảng Cộng sản Việt Nam.
2. Bảo đảm tính hợp hiến, tính hợp pháp, tính thống nhất của văn bản quy
phạm pháp luật trong hệ thống pháp luật và không trái với điều ước quốc tế mà
nước Cộng hòa xã hội chủ nghĩa Việt Nam là thành viên; tuân thủ đúng thẩm
quyền, nội dung, hình thức và trình tự, thủ tục xây dựng, ban hành văn bản quy
phạm pháp luật.
3. Bảo đảm chủ quyền quốc gia, quốc phòng, an ninh, lợi ích quốc gia, dân
tộc; kiểm soát quyền lực, phòng, chống tham nhũng, tiêu cực, lãng phí; phòng,
chống lợi ích nhóm, cục bộ.
4. Tôn trọng, bảo vệ và bảo đảm quyền con người, quyền công dân, bình
đẳng giới; bảo đảm dân chủ, công bằng, nhân đạo, công khai, minh bạch, khoa
học, kịp thời, ổn định, khả thi, hiệu quả.
5. Bảo đảm việc thực hiện chủ trương phân quyền, phân cấp; giải quyết vấn
đề bất cập, phát sinh từ thực tiễn; vấn đề mới, xu hướng mới; yêu cầu quản lý
nhà nước và khuyến khích sáng tạo, khơi thông mọi nguồn lực, thúc đẩy phát
triển kinh tế - xã hội.
6. Văn bản quy phạm pháp luật quy định thực hiện thí điểm phải xác định
thời gian thực hiện thí điểm và phải được sơ kết, tổng kết để xem xét, quyết định
việc tiếp tục áp dụng hoặc ban hành văn bản quy phạm pháp luật để áp dụng
chính thức.
7. Bảo đảm thực hiện quy định của pháp luật về bảo vệ bí mật nhà nước đối
với nội dung văn bản quy phạm pháp luật thuộc phạm vi bí mật nhà nước.
Điều 6. Phản biện xã hội, tham vấn, góp ý đối với chính sách, dự thảo
văn bản quy phạm pháp luật
1. Mặt trận Tổ quốc Việt Nam và các tổ chức chính trị - xã hội thực hiện
phản biện xã hội đối với dự thảo văn bản quy phạm pháp luật theo quy định của
Luật này, Luật Mặt trận Tổ quốc Việt Nam và các luật khác có liên quan.
Phản biện xã hội được thực hiện trong thời gian tổ chức soạn thảo văn bản
quy phạm pháp luật.
2. Cơ quan lập đề xuất chính sách có trách nhiệm tham vấn Hội đồng Dân
tộc, Ủy ban của Quốc hội, Bộ, cơ quan ngang Bộ theo quy định của Luật này.
3. Mặt trận Tổ quốc Việt Nam, các tổ chức thành viên của Mặt trận và các
cơ quan, tổ chức, cá nhân có quyền và được tạo điều kiện tham gia góp ý kiến về
chính sách, dự thảo văn bản quy phạm pháp luật.
4. Cơ quan lập đề xuất chính sách, cơ quan chủ trì soạn thảo có trách nhiệm
nghiên cứu tiếp thu, giải trình đầy đủ và công khai việc tiếp thu, giải trình ý kiến
phản biện xã hội, tham vấn chính sách, góp ý chính sách, dự thảo văn bản quy
phạm pháp luật.
Điều 7. Ngôn ngữ, thể thức, kỹ thuật trình bày và dịch văn bản quy
phạm pháp luật ra tiếng dân tộc thiểu số, tiếng nước ngoài
1. Ngôn ngữ được sử dụng trong văn bản quy phạm pháp luật là tiếng Việt,
bảo đảm chính xác, phổ thông, thống nhất, diễn đạt rõ ràng, dễ hiểu.
2. Văn bản quy phạm pháp luật có thể được bố cục theo phần, chương,
mục, tiểu mục, điều, khoản, điểm; phần, chương, mục, tiểu mục, điều phải có
tên.
3. Văn bản quy phạm pháp luật phải đánh số, ký hiệu bảo đảm thể hiện rõ
số thứ tự liên tục, năm ban hành, loại văn bản, cơ quan, người có thẩm quyền
ban hành văn bản.
4. Văn bản quy phạm pháp luật có thể được dịch ra tiếng dân tộc thiểu số,
tiếng nước ngoài. Bản dịch có giá trị tham khảo.
Điều 8. Sửa đổi, bổ sung, thay thế, bãi bỏ hoặc đình chỉ việc thi hành
văn bản quy phạm pháp luật
1. Văn bản quy phạm pháp luật chỉ được sửa đổi, bổ sung, thay thế bằng
văn bản quy phạm pháp luật của chính cơ quan, người có thẩm quyền đã ban
hành văn bản đó hoặc bị đình chỉ việc thi hành bằng văn bản của cơ quan, người
có thẩm quyền, trừ trường hợp quy định tại điểm a và điểm b khoản 2 Điều 54
của Luật này hoặc luật, nghị quyết của Quốc hội có quy định khác.
2. Văn bản quy phạm pháp luật bị bãi bỏ bằng văn bản của chính cơ quan,
người có thẩm quyền đã ban hành văn bản đó hoặc bằng văn bản của cơ quan,
người có thẩm quyền, trừ trường hợp quy định tại điểm a và điểm b khoản 2
Điều 54 của Luật này.
3. Văn bản sửa đổi, bổ sung, thay thế, bãi bỏ hoặc đình chỉ việc thi hành
văn bản khác phải xác định rõ tên văn bản, phần, chương, mục, tiểu mục, điều,
khoản, điểm của văn bản bị sửa đổi, bổ sung, thay thế, bãi bỏ hoặc đình chỉ việc
thi hành.
Trường hợp bãi bỏ pháp lệnh thì Ủy ban Thường vụ Quốc hội có trách
nhiệm báo cáo Quốc hội tại kỳ họp gần nhất.
Văn bản bãi bỏ hoặc đình chỉ việc thi hành văn bản quy phạm pháp luật
quy định tại khoản 1 và khoản 2 Điều này phải được đăng tải trên công báo điện
tử, cơ sở dữ liệu quốc gia về pháp luật.
4. Ban hành văn bản quy phạm pháp luật thay thế văn bản quy phạm pháp
luật hiện hành thuộc một trong các trường hợp sau đây:
a) Thay đổi cơ bản chính sách, phạm vi điều chỉnh, đối tượng áp dụng;
b) Sửa đổi, bổ sung về nội dung quá một phần hai tổng số điều.
5. Cơ quan, người có thẩm quyền ban hành văn bản quy phạm pháp luật
phải đồng thời sửa đổi, bổ sung, bãi bỏ toàn bộ hoặc một phần của văn bản quy
phạm pháp luật do mình đã ban hành khác với quy định của văn bản quy phạm
pháp luật mới được ban hành. Trường hợp có quy định khác nhưng cần tiếp tục
được áp dụng thì phải được quy định rõ trong văn bản quy phạm pháp luật mới
được ban hành.
6. Văn bản quy phạm pháp luật có thể được ban hành để đồng thời sửa đổi,
bổ sung, thay thế, bãi bỏ nội dung của nhiều văn bản quy phạm pháp luật do
cùng một cơ quan, người có thẩm quyền ban hành.
Điều 9. Gửi, lưu trữ văn bản quy phạm pháp luật
1. Chậm nhất là 03 ngày kể từ ngày công bố luật, nghị quyết của Quốc hội,
pháp lệnh, nghị quyết của Ủy ban Thường vụ Quốc hội hoặc ký chứng thực, ký
ban hành đối với văn bản quy phạm pháp luật khác, cơ quan, người có thẩm
quyền ban hành văn bản quy phạm pháp luật có trách nhiệm gửi văn bản để
đăng tải trên công báo điện tử, cơ sở dữ liệu quốc gia về pháp luật.
2. Hồ sơ chính sách, dự án và bản gốc của văn bản quy phạm pháp luật phải
được lưu trữ theo quy định của pháp luật về lưu trữ.
3. Văn bản quy phạm pháp luật của cơ quan, người có thẩm quyền ở trung
ương ban hành phải được đăng tải trên công báo điện tử nước Cộng hòa xã hội
chủ nghĩa Việt Nam. Văn bản quy phạm pháp luật của Hội đồng nhân dân, Ủy
ban nhân dân, chính quyền địa phương ở đơn vị hành chính - kinh tế đặc biệt
phải được đăng tải trên công báo điện tử cấp tỉnh.
4. Văn bản quy phạm pháp luật đăng tải trên công báo điện tử có giá trị như
văn bản gốc.
Chương II
THẨM QUYỀN BAN HÀNH,
NỘI DUNG VĂN BẢN QUY PHẠM PHÁP LUẬT
Điều 10. Luật, nghị quyết của Quốc hội
1. Quốc hội ban hành luật để quy định:
a) Tổ chức và hoạt động của Quốc hội, Chủ tịch nước, Chính phủ, Tòa án
nhân dân, Viện kiểm sát nhân dân, Hội đồng bầu cử quốc gia, Kiểm toán nhà
nước, chính quyền địa phương, đơn vị hành chính - kinh tế đặc biệt và cơ quan
khác do Quốc hội thành lập;
b) Quyền con người, quyền và nghĩa vụ cơ bản của công dân mà theo Hiến
pháp phải do luật định; việc hạn chế quyền con người, quyền công dân; tội
phạm và hình phạt; tố tụng tư pháp;
c) Chính sách cơ bản về kinh tế, xã hội, văn hóa, giáo dục, khoa học, công
nghệ, môi trường, tài chính, tiền tệ quốc gia, ngân sách nhà nước; quy định các
thứ thuế, về huân chương, huy chương và danh hiệu vinh dự nhà nước;
d) Chính sách cơ bản về quốc phòng, an ninh quốc gia; hàm, cấp trong lực
lượng vũ trang nhân dân; quy định về tình trạng khẩn cấp, các biện pháp đặc
biệt khác bảo đảm quốc phòng và an ninh quốc gia;
đ) Chính sách cơ bản về đối ngoại; hàm, cấp ngoại giao; hàm, cấp nhà
nước khác;
e) Chính sách dân tộc, chính sách tôn giáo của Nhà nước;
g) Trưng cầu ý dân;
h) Cơ chế bảo vệ Hiến pháp;
i) Vấn đề khác thuộc thẩm quyền của Quốc hội theo quy định của Hiến
pháp và luật.
2. Quốc hội ban hành nghị quyết để quy định:
a) Thực hiện thí điểm một số chính sách mới thuộc thẩm quyền quyết định
của Quốc hội khác với quy định của luật hiện hành;
b) Tạm ngưng, điều chỉnh hiệu lực hoặc kéo dài thời hạn áp dụng toàn bộ
hoặc một phần luật, nghị quyết của Quốc hội đáp ứng yêu cầu cấp bách về phát
triển kinh tế - xã hội, bảo đảm quyền con người, quyền công dân;
c) Vấn đề khác do Quốc hội quyết định.
Điều 11. Pháp lệnh, nghị quyết của Ủy ban Thường vụ Quốc hội
1. Ủy ban Thường vụ Quốc hội ban hành pháp lệnh trong trường hợp được
Quốc hội giao.
2. Ủy ban Thường vụ Quốc hội ban hành nghị quyết để quy định:
a) Giải thích Hiến pháp, luật, nghị quyết của Quốc hội và pháp lệnh, nghị
quyết của Ủy ban Thường vụ Quốc hội;
b) Tạm ngưng, điều chỉnh hiệu lực hoặc kéo dài thời hạn áp dụng toàn bộ
hoặc một phần pháp lệnh, nghị quyết của Ủy ban Thường vụ Quốc hội đáp ứng
yêu cầu cấp bách về phát triển kinh tế - xã hội;
c) Tổng động viên hoặc động viên cục bộ; ban bố, bãi bỏ tình trạng khẩn
cấp trong cả nước hoặc ở từng địa phương;
d) Hướng dẫn hoạt động của Hội đồng nhân dân;
đ) Nội dung được luật, nghị quyết của Quốc hội giao, trừ trường hợp quy
định tại khoản 1 Điều này;
e) Vấn đề khác thuộc thẩm quyền của Ủy ban Thường vụ Quốc hội.
Điều 12. Lệnh, quyết định của Chủ tịch nước
Chủ tịch nước ban hành lệnh, quyết định để quy định:
1. Tổng động viên hoặc động viên cục bộ; công bố, bãi bỏ tình trạng khẩn
cấp trong cả nước hoặc ở từng địa phương;
2. Vấn đề khác thuộc thẩm quyền của Chủ tịch nước.
Điều 13. Nghị quyết liên tịch giữa Ủy ban Thường vụ Quốc hội, Chính
phủ, Đoàn Chủ tịch Ủy ban Trung ương Mặt trận Tổ quốc Việt Nam
Ủy ban Thường vụ Quốc hội, Chính phủ, Đoàn Chủ tịch Ủy ban Trung
ương Mặt trận Tổ quốc Việt Nam ban hành nghị quyết liên tịch để quy định chi
tiết những vấn đề được luật giao hoặc hướng dẫn một số vấn đề cần thiết trong
công tác bầu cử đại biểu Quốc hội, đại biểu Hội đồng nhân dân.
Điều 14. Nghị định, nghị quyết của Chính phủ
1. Chính phủ ban hành nghị định để quy định:
a) Chi tiết điều, khoản, điểm và các nội dung khác được giao trong luật,
nghị quyết của Quốc hội, pháp lệnh, nghị quyết của Ủy ban Thường vụ Quốc
hội, lệnh, quyết định của Chủ tịch nước;
b) Các biện pháp cụ thể để tổ chức thi hành Hiến pháp; các biện pháp cụ
thể để tổ chức, hướng dẫn thi hành luật, nghị quyết của Quốc hội, pháp lệnh,
nghị quyết của Ủy ban Thường vụ Quốc hội, lệnh, quyết định của Chủ tịch
nước; các biện pháp để thực hiện chính sách kinh tế - xã hội, quốc phòng, an
ninh, tài chính, tiền tệ, ngân sách, thuế, dân tộc, tôn giáo, văn hóa, giáo dục, y tế,
khoa học, công nghệ, môi trường, đối ngoại, chế độ công vụ, cán bộ, công chức,
viên chức, quyền, nghĩa vụ của công dân và các vấn đề khác thuộc thẩm quyền
quản lý, điều hành của Chính phủ; những vấn đề liên quan đến nhiệm vụ, quyền
hạn của từ 02 Bộ, cơ quan ngang Bộ trở lên; nhiệm vụ, quyền hạn, tổ chức bộ
máy của các Bộ, cơ quan ngang Bộ, cơ quan thuộc Chính phủ và các cơ quan
khác thuộc thẩm quyền của Chính phủ; phân cấp nhiệm vụ, quyền hạn;
c) Vấn đề cần thiết thuộc thẩm quyền của Quốc hội, Ủy ban Thường vụ
Quốc hội nhưng chưa đủ điều kiện xây dựng thành luật hoặc pháp lệnh để đáp
ứng yêu cầu quản lý nhà nước, quản lý kinh tế, quản lý xã hội. Trước khi ban
hành nghị định này phải được sự đồng ý của Ủy ban Thường vụ Quốc hội.
2. Chính phủ ban hành nghị quyết để quy định:
a) Giải quyết các vấn đề cấp bách, quan trọng phát sinh từ thực tiễn và để
áp dụng trong một thời gian nhất định, phạm vi cụ thể thuộc thẩm quyền của
Chính phủ; phân cấp nhiệm vụ, quyền hạn;
b) Tạm ngưng, điều chỉnh hiệu lực hoặc kéo dài thời hạn áp dụng toàn bộ
hoặc một phần nghị định của Chính phủ đáp ứng yêu cầu cấp bách về phát triển
kinh tế - xã hội, bảo đảm quyền con người, quyền công dân;
c) Thực hiện thí điểm một số chính sách chưa có pháp luật điều chỉnh thuộc
thẩm quyền của Chính phủ hoặc khác với nghị định, nghị quyết của Chính phủ.
Điều 15. Quyết định của Thủ tướng Chính phủ
Thủ tướng Chính phủ ban hành quyết định để quy định:
1. Nội dung được giao trong luật, nghị quyết của Quốc hội, pháp lệnh, nghị
quyết của Ủy ban Thường vụ Quốc hội, lệnh, quyết định của Chủ tịch nước,
nghị định, nghị quyết của Chính phủ;
2. Biện pháp chỉ đạo, điều hành hoạt động của Chính phủ và hệ thống hành
chính nhà nước từ trung ương đến địa phương, chế độ làm việc với các thành
viên Chính phủ, chính quyền địa phương và các vấn đề khác thuộc thẩm quyền
của Thủ tướng Chính phủ; phân cấp và thực hiện nhiệm vụ, quyền hạn được
phân cấp;
3. Biện pháp chỉ đạo, phối hợp hoạt động của các thành viên Chính phủ;
kiểm tra hoạt động của các Bộ, cơ quan ngang Bộ, cơ quan thuộc Chính phủ,
chính quyền địa phương trong việc thực hiện chủ trương, đường lối của Đảng,
chính sách, pháp luật của Nhà nước.
Điều 16. Nghị quyết của Hội đồng Thẩm phán Tòa án nhân dân tối
cao, thông tư của Chánh án Tòa án nhân dân tối cao
1. Hội đồng Thẩm phán Tòa án nhân dân tối cao ban hành nghị quyết
hướng dẫn áp dụng thống nhất pháp luật trong xét xử.
2. Chánh án Tòa án nhân dân tối cao ban hành thông tư để quy định việc
quản lý các Tòa án nhân dân, Tòa án quân sự về tổ chức, hoạt động, những vấn
đề khác thuộc thẩm quyền hoặc được giao tại Luật Tổ chức Tòa án nhân dân và
văn bản quy phạm pháp luật khác của Quốc hội, Ủy ban Thường vụ Quốc hội,
Chủ tịch nước.
Điều 17. Thông tư của Viện trưởng Viện kiểm sát nhân dân tối cao
Viện trưởng Viện kiểm sát nhân dân tối cao ban hành thông tư để quy định
những vấn đề thuộc thẩm quyền hoặc được giao tại Luật Tổ chức Viện kiểm sát
nhân dân và văn bản quy phạm pháp luật khác của Quốc hội, Ủy ban Thường vụ
Quốc hội, Chủ tịch nước.
Điều 18. Thông tư của Bộ trưởng, Thủ trưởng cơ quan ngang Bộ
Bộ trưởng, Thủ trưởng cơ quan ngang Bộ ban hành thông tư để quy định:
1. Chi tiết điều, khoản, điểm và các nội dung khác được giao trong luật,
nghị quyết của Quốc hội, pháp lệnh, nghị quyết của Ủy ban Thường vụ Quốc
hội, lệnh, quyết định của Chủ tịch nước, nghị định, nghị quyết của Chính phủ,
quyết định của Thủ tướng Chính phủ;
2. Biện pháp thực hiện chức năng quản lý nhà nước của mình; phân cấp và
thực hiện nhiệm vụ, quyền hạn được phân cấp.
Điều 19. Thông tư của Tổng Kiểm toán nhà nước
Tổng Kiểm toán nhà nước ban hành thông tư để quy định chuẩn mực kiểm
toán nhà nước, quy trình kiểm toán, hồ sơ kiểm toán, những vấn đề thuộc thẩm
quyền hoặc được giao tại Luật Kiểm toán nhà nước và văn bản quy phạm pháp
luật khác của Quốc hội, Ủy ban Thường vụ Quốc hội.
Điều 20. Thông tư liên tịch giữa Chánh án Tòa án nhân dân tối cao,
Viện trưởng Viện kiểm sát nhân dân tối cao, Tổng Kiểm toán nhà nước, Bộ
trưởng, Thủ trưởng cơ quan ngang Bộ
1. Chánh án Tòa án nhân dân tối cao, Viện trưởng Viện kiểm sát nhân dân
tối cao, Tổng Kiểm toán nhà nước, Bộ trưởng, Thủ trưởng cơ quan ngang Bộ
ban hành thông tư liên tịch để quy định việc phối hợp trong việc thực hiện trình
tự, thủ tục tố tụng, thi hành án, thi hành tạm giữ, tạm giam; phòng, chống tham
nhũng và công tác bồi thường nhà nước; nội dung được giao trong luật, nghị
quyết của Quốc hội, pháp lệnh, nghị quyết của Ủy ban Thường vụ Quốc hội,
lệnh, quyết định của Chủ tịch nước.
2. Không ban hành thông tư liên tịch giữa Bộ trưởng, Thủ trưởng cơ quan
ngang Bộ.
Điều 21. Nghị quyết của Hội đồng nhân dân cấp tỉnh, quyết định của
Ủy ban nhân dân cấp tỉnh
1. Hội đồng nhân dân cấp tỉnh ban hành nghị quyết để quy định:
a) Chi tiết điều, khoản, điểm và các nội dung khác được giao trong văn bản
quy phạm pháp luật của cơ quan nhà nước cấp trên;
b) Chính sách, biện pháp nhằm bảo đảm thi hành Hiến pháp, luật, văn bản
quy phạm pháp luật của cơ quan nhà nước cấp trên;
c) Biện pháp nhằm phát triển kinh tế - xã hội, ngân sách, quốc phòng, an
ninh ở địa phương; biện pháp khác có tính chất đặc thù phù hợp với điều kiện
phát triển kinh tế - xã hội của địa phương; thực hiện nhiệm vụ, quyền hạn được
phân cấp;
d) Thực hiện thí điểm các chính sách theo quy định của Luật Tổ chức chính
quyền địa phương.
2. Ủy ban nhân dân cấp tỉnh ban hành quyết định để quy định:
a) Chi tiết điều, khoản, điểm và các nội dung khác được giao trong văn bản
quy phạm pháp luật của cơ quan nhà nước cấp trên;
b) Biện pháp thi hành Hiến pháp, luật, văn bản quy phạm pháp luật của cơ
quan nhà nước cấp trên, nghị quyết của Hội đồng nhân dân cùng cấp về phát
triển kinh tế - xã hội, ngân sách, quốc phòng, an ninh ở địa phương;
c) Biện pháp thực hiện chức năng quản lý nhà nước ở địa phương; phân cấp
và thực hiện nhiệm vụ, quyền hạn được phân cấp.
Điều 22. Văn bản quy phạm pháp luật của chính quyền địa phương ở
đơn vị hành chính - kinh tế đặc biệt và cấp huyện
1. Chính quyền địa phương ở đơn vị hành chính - kinh tế đặc biệt ban hành
văn bản quy phạm pháp luật theo quy định của Luật này và văn bản quy phạm
pháp luật khác có liên quan của Quốc hội.
2. Hội đồng nhân dân cấp huyện ban hành nghị quyết để quy định những
vấn đề được luật, nghị quyết của Quốc hội giao; thực hiện nhiệm vụ, quyền hạn
được phân cấp.
10
3. Ủy ban nhân dân cấp huyện ban hành quyết định để quy định những vấn
đề được luật, nghị quyết của Quốc hội giao; phân cấp và thực hiện nhiệm vụ,
quyền hạn được phân cấp.
Chương III
XÂY DỰNG, BAN HÀNH VĂN BẢN QUY PHẠM PHÁP LUẬT CỦA
QUỐC HỘI, ỦY BAN THƯỜNG VỤ QUỐC HỘI
Mục 1
ĐỊNH HƯỚNG LẬP PHÁP NHIỆM KỲ VÀ CHƯƠNG TRÌNH
LẬP PHÁP HẰNG NĂM CỦA QUỐC HỘI
Điều 23. Định hướng lập pháp nhiệm kỳ của Quốc hội
1. Ủy ban Thường vụ Quốc hội chủ trì, phối hợp với Chính phủ xây dựng
Định hướng lập pháp nhiệm kỳ của Quốc hội, hoàn thành trước ngày 01 tháng 9
của năm đầu tiên nhiệm kỳ Quốc hội, để trình cơ quan có thẩm quyền của Đảng
phê duyệt.
Ủy ban Thường vụ Quốc hội tự mình đề xuất nhiệm vụ lập pháp; Chủ tịch
nước, Hội đồng Dân tộc, Ủy ban của Quốc hội, Chính phủ, Tòa án nhân dân tối
cao, Viện kiểm sát nhân dân tối cao, Kiểm toán nhà nước, Ủy ban Trung ương
Mặt trận Tổ quốc Việt Nam và cơ quan trung ương của tổ chức thành viên của
Mặt trận, đại biểu Quốc hội gửi đề xuất nhiệm vụ lập pháp đến Ủy ban Thường
vụ Quốc hội trước ngày 01 tháng 8 của năm đầu tiên nhiệm kỳ Quốc hội để xem
xét đưa vào Định hướng lập pháp nhiệm kỳ của Quốc hội.
2. Căn cứ xây dựng Định hướng lập pháp nhiệm kỳ của Quốc hội bao gồm:
a) Chủ trương, đường lối của Đảng, các định hướng, kết luận của cơ quan
có thẩm quyền của Đảng và Nhà nước;
b) Kết quả thực hiện Định hướng lập pháp nhiệm kỳ của Quốc hội nhiệm
kỳ trước, yêu cầu tiếp tục xây dựng, hoàn thiện hệ thống pháp luật;
c) Vấn đề mới, xu hướng mới cần có pháp luật điều chỉnh;
d) Yêu cầu giải quyết vấn đề bất cập, phát sinh từ thực tiễn.
3. Đề xuất nhiệm vụ lập pháp bao gồm: tờ trình; danh mục nhiệm vụ lập
pháp, trong đó nêu rõ căn cứ, nội dung cần được nghiên cứu, rà soát, thể chế
hóa, dự kiến thời hạn hoàn thành việc nghiên cứu, rà soát và thời hạn cần sửa
đổi, bổ sung hoặc ban hành mới luật, nghị quyết của Quốc hội, pháp lệnh, nghị
quyết của Ủy ban Thường vụ Quốc hội (nếu có).
4. Định hướng lập pháp nhiệm kỳ của Quốc hội là danh mục các nhiệm vụ
lập pháp, trong đó xác định cụ thể yêu cầu về việc rà soát, đề xuất sửa đổi, bổ
sung hoặc nghiên cứu, đề xuất ban hành mới luật, nghị quyết của Quốc hội, pháp
lệnh, nghị quyết của Ủy ban Thường vụ Quốc hội; cơ quan chủ trì thực hiện;
thời gian hoàn thành việc nghiên cứu, rà soát được sắp xếp theo thứ tự ưu tiên
hằng năm của nhiệm kỳ Quốc hội.
`;

const NDD_30_2020_TEXT = `
CHÍNH PHỦ
Số: 30/2020/NĐ-CP
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
Hà Nội, ngày 05 tháng 3 năm 2020
NGHỊ ĐỊNH
Về công tác văn thư
Căn cứ Luật Tổ chức Chính phủ ngày 19 tháng 6 năm 2015;
Theo đề nghị của Bộ trưởng Bộ Nội vụ;
Chính phủ ban hành Nghị định về công tác văn thư.
Chương I
QUY ĐỊNH CHUNG
Điều 1. Phạm vi điều chỉnh
Nghị định này quy định về công tác văn thư và quản lý nhà nước về công
tác văn thư. Công tác văn thư được quy định tại Nghị định này bao gồm: Soạn
thảo, ký ban hành văn bản; quản lý văn bản; lập hồ sơ và nộp lưu hồ sơ, tài
liệu vào Lưu trữ cơ quan; quản lý và sử dụng con dấu, thiết bị lưu khóa bí mật
trong công tác văn thư.
Điều 2. Đối tượng áp dụng
1. Nghị định này áp dụng đối với cơ quan, tổ chức nhà nước và doanh
nghiệp nhà nước (sau đây gọi chung là cơ quan, tổ chức).
2. Tổ chức chính trị, tổ chức chính trị - xã hội, tổ chức xã hội, tổ chức xã
hội - nghề nghiệp căn cứ quy định của Nghị định này và các quy định của
Đảng, của pháp luật có liên quan để áp dụng cho phù hợp.
Điều 3. Giải thích từ ngữ
Trong Nghị định này, những từ ngữ dưới đây được hiểu như sau:
1. “Văn bản” là thông tin thành văn được truyền đạt bằng ngôn ngữ hoặc
ký hiệu, hình thành trong hoạt động của các cơ quan, tổ chức và được trình
bày đúng thể thức, kỹ thuật theo quy định.
2. “Văn bản chuyên ngành” là văn bản hình thành trong quá trình thực
hiện hoạt động chuyên môn, nghiệp vụ của một ngành, lĩnh vực do người
đứng đầu cơ quan quản lý ngành, lĩnh vực quy định.
3. “Văn bản hành chính” là văn bản hình thành trong quá trình chỉ đạo,
điều hành, giải quyết công việc của các cơ quan, tổ chức.
4. “Văn bản điện tử” là văn bản dưới dạng thông điệp dữ liệu được tạo
lập hoặc được số hóa từ văn bản giấy và trình bày đúng thể thức, kỹ thuật,
định dạng theo quy định.
5. “Văn bản đi” là tất cả các loại văn bản do cơ quan, tổ chức ban hành.
6. “Văn bản đến” là tất cả các loại văn bản do cơ quan, tổ chức nhận
được từ cơ quan, tổ chức, cá nhân khác gửi đến.
7. “Bản thảo văn bản” là bản được viết hoặc đánh máy hoặc tạo lập bằng
phương tiện điện tử hình thành trong quá trình soạn thảo một văn bản của cơ
quan, tổ chức.
8. “Bản gốc văn bản” là bản hoàn chỉnh về nội dung, thể thức văn bản,
được người có thẩm quyền trực tiếp ký trên văn bản giấy hoặc ký số trên văn
bản điện tử.
9. “Bản chính văn bản giấy” là bản hoàn chỉnh về nội dung, thể thức văn
bản, được tạo từ bản có chữ ký trực tiếp của người có thẩm quyền.
10. “Bản sao y” là bản sao đầy đủ, chính xác nội dung của bản gốc hoặc
bản chính văn bản, được trình bày theo thể thức và kỹ thuật quy định.
11. “Bản sao lục” là bản sao đầy đủ, chính xác nội dung của bản sao y,
được trình bày theo thể thức và kỹ thuật quy định.
12. “Bản trích sao” là bản sao chính xác phần nội dung của bản gốc hoặc
phần nội dung của bản chính văn bản cần trích sao, được trình bày theo thể
thức và kỹ thuật quy định.
13. “Danh mục hồ sơ” là bảng kê có hệ thống những hồ sơ dự kiến được
lập trong năm của cơ quan, tổ chức.
14. “Hồ sơ” là tập hợp các văn bản, tài liệu có liên quan với nhau về một
vấn đề, một sự việc, một đối tượng cụ thể hoặc có đặc điểm chung, hình thành
trong quá trình theo dõi, giải quyết công việc thuộc phạm vi, chức năng,
nhiệm vụ của cơ quan, tổ chức, cá nhân.
15. “Lập hồ sơ” là việc tập hợp, sắp xếp văn bản, tài liệu hình thành
trong quá trình theo dõi, giải quyết công việc của cơ quan, tổ chức, cá nhân
theo những nguyên tắc và phương pháp nhất định.
16. “Hệ thống quản lý tài liệu điện tử” là Hệ thống thông tin được xây
dựng với chức năng chính để thực hiện việc tin học hóa công tác soạn thảo,
ban hành văn bản; quản lý văn bản; lập hồ sơ và nộp lưu hồ sơ, tài liệu vào
Lưu trữ cơ quan trên môi trường mạng (sau đây gọi chung là Hệ thống).
17. “Văn thư cơ quan” là bộ phận thực hiện một số nhiệm vụ công tác
văn thư của cơ quan, tổ chức.
Điều 4. Nguyên tắc, yêu cầu quản lý công tác văn thư
1. Nguyên tắc
Công tác văn thư được thực hiện thống nhất theo quy định của pháp luật.
2. Yêu cầu
a) Văn bản của cơ quan, tổ chức phải được soạn thảo và ban hành đúng
thẩm quyền, trình tự, thủ tục, hình thức, thể thức và kỹ thuật trình bày theo
quy định của pháp luật: Đối với văn bản quy phạm pháp luật được thực hiện
theo quy định của Luật Ban hành văn bản quy phạm pháp luật; đối với văn
bản chuyên ngành do người đứng đầu cơ quan quản lý ngành, lĩnh vực căn cứ
Nghị định này để quy định cho phù hợp; đối với văn bản hành chính được
thực hiện theo quy định tại Chương II Nghị định này.
b) Tất cả văn bản đi, văn bản đến của cơ quan, tổ chức phải được quản lý
tập trung tại Văn thư cơ quan để làm thủ tục tiếp nhận, đăng ký, trừ những
loại văn bản được đăng ký riêng theo quy định của pháp luật.
c) Văn bản đi, văn bản đến thuộc ngày nào phải được đăng ký, phát hành
hoặc chuyển giao trong ngày, chậm nhất là trong ngày làm việc tiếp theo. Văn
bản đến có các mức độ khẩn: “Hỏa tốc”, “Thượng khẩn” và “Khẩn” (sau đây
gọi chung là văn bản khẩn) phải được đăng ký, trình và chuyển giao ngay sau
khi nhận được.
d) Văn bản phải được theo dõi, cập nhật trạng thái gửi, nhận, xử lý.
đ) Người được giao giải quyết, theo dõi công việc của cơ quan, tổ chức
có trách nhiệm lập hồ sơ về công việc được giao và nộp lưu hồ sơ, tài liệu vào
Lưu trữ cơ quan.
e) Con dấu, thiết bị lưu khóa bí mật của cơ quan, tổ chức phải được quản
lý, sử dụng theo quy định của pháp luật.
g) Hệ thống phải đáp ứng các quy định tại Phụ lục VI Nghị định này và
các quy định của pháp luật có liên quan.
Điều 5. Giá trị pháp lý của văn bản điện tử
1. Văn bản điện tử được ký số bởi người có thẩm quyền và ký số của cơ
quan, tổ chức theo quy định của pháp luật có giá trị pháp lý như bản gốc văn
bản giấy.
2. Chữ ký số trên văn bản điện tử phải đáp ứng đầy đủ các quy định của
pháp luật.
Điều 6. Trách nhiệm của cơ quan, tổ chức, cá nhân đối với công tác
văn thư
1. Người đứng đầu cơ quan, tổ chức, trong phạm vi quyền hạn được giao
có trách nhiệm chỉ đạo thực hiện đúng quy định về công tác văn thư; chỉ đạo
việc nghiên cứu, ứng dụng khoa học và công nghệ vào công tác văn thư.
2. Cá nhân trong quá trình theo dõi, giải quyết công việc có liên quan
đến công tác văn thư phải thực hiện đúng quy định tại Nghị định này và các
quy định của pháp luật có liên quan.
3. Văn thư cơ quan có nhiệm vụ
a) Đăng ký, thực hiện thủ tục phát hành, chuyển phát và theo dõi việc
chuyển phát văn bản đi.
b) Tiếp nhận, đăng ký văn bản đến; trình, chuyển giao văn bản đến.
c) Sắp xếp, bảo quản và phục vụ việc tra cứu, sử dụng bản lưu văn bản.
d) Quản lý Sổ đăng ký văn bản.
đ) Quản lý, sử dụng con dấu, thiết bị lưu khóa bí mật của cơ quan, tổ
chức; các loại con dấu khác theo quy định.
Chương II
SOẠN THẢO, KÝ BAN HÀNH VĂN BẢN HÀNH CHÍNH
Mục 1
THỂ THỨC, KỸ THUẬT TRÌNH BÀY VĂN BẢN HÀNH CHÍNH
Điều 7. Các loại văn bản hành chính
Văn bản hành chính gồm các loại văn bản sau: Nghị quyết (cá biệt),
quyết định (cá biệt), chỉ thị, quy chế, quy định, thông cáo, thông báo, hướng
dẫn, chương trình, kế hoạch, phương án, đề án, dự án, báo cáo, biên bản, tờ
trình, hợp đồng, công văn, công điện, bản ghi nhớ, bản thỏa thuận, giấy uỷ
quyền, giấy mời, giấy giới thiệu, giấy nghỉ phép, phiếu gửi, phiếu chuyển,
phiếu báo, thư công.
`;

// --- END: Legal Document Text ---

// --- START: System Instructions ---
export const DETAILED_SYSTEM_INSTRUCTION_ANALYZE_DOCUMENT = `Bạn là một chuyên gia hàng đầu về nghiên cứu và phân tích các văn bản, tài liệu của Đảng và Nhà nước Việt Nam, bao gồm: nghị quyết, chỉ thị, luật, kế hoạch, chính sách... do Bộ Chính trị, Ban Chấp hành Trung ương, Quốc hội, Chính phủ, các Bộ, Ban, Ngành và các địa phương ban hành.
Nhiệm vụ của bạn là nhận văn bản, URL hoặc tệp và trả về một đối tượng JSON có cấu trúc. KHÔNG thêm bất kỳ văn bản nào bên ngoài khối JSON.

**LƯU Ý QUAN TRỌNG VỀ ĐỊNH DẠNG JSON:**
- **Toàn bộ phản hồi của bạn PHẢI là một chuỗi JSON duy nhất, hợp lệ, không có chú thích hay văn bản nào bên ngoài.**
- **Bên trong chuỗi giá trị của key "analysis", tất cả các ký tự đặc biệt PHẢI được escape đúng chuẩn JSON. Cụ thể:**
    - **Ký tự xuống dòng phải được chuyển thành \`\\n\`**.
    - **Dấu ngoặc kép (") phải được chuyển thành \`\\"\`**.
    - **Dấu gạch chéo ngược (\\) phải được chuyển thành \`\\\\ \`**.
- **Việc này ĐẢM BẢO chuỗi JSON có thể được phân tích cú pháp một cách chính xác.**

ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
Phản hồi của bạn PHẢI là một đối tượng JSON hợp lệ với cấu trúc sau:
{
  "analysis": "...",
  "extractedUrls": [...]
}

TRONG ĐÓ:
- "analysis": (string) **QUAN TRỌNG:** Giá trị của trường này PHẢI là một chuỗi văn bản thuần túy (plain text) **đã được escape đúng chuẩn JSON**. TUYỆT ĐỐI KHÔNG được là một chuỗi JSON khác. KHÔNG sử dụng các định dạng Markdown (như ###, **, *) hoặc mã HTML. Chuỗi văn bản này phải chứa nội dung phân tích chi tiết văn bản/URL và tuân thủ các nguyên tắc cốt lõi sau:

    **0. Chính xác tuyệt đối:** Mọi thông tin, nhận định, phân tích phải dựa hoàn toàn vào nội dung trong tài liệu được cung cấp. Tuyệt đối không được suy diễn, phỏng đoán hay bịa đặt thông tin không có trong văn bản gốc.

    **1. Thân thiện – chuyên nghiệp – dễ hiểu:**
    - Luôn sử dụng ngôn ngữ lịch sự, gần gũi, dễ tiếp cận với cán bộ, công chức.
    - Diễn giải rõ ràng từng phần nội dung bảo đảm người dùng không có chuyên môn vẫn hiểu được.
    - Giữ phong cách thân thiện – chuyên nghiệp – hỗ trợ tận tình.

    **2. Phân tích có hệ thống – bám sát nội dung văn bản, tài liệu gốc:**
    - **Sử dụng tiêu đề bằng chữ IN HOA để phân tách các phần (ví dụ: TÓM TẮT NỘI DUNG:, PHÂN TÍCH CHI TIẾT:, NHIỆM VỤ CẦN THỰC HIỆN:).**
    - Tóm tắt chính xác và ngắn gọn nội dung cốt lõi của văn bản.
    - Phân tích chi tiết, có cấu trúc rõ ràng, bám sát cấu trúc của văn bản gốc nếu có.
    - Diễn giải logic từng mục, chỉ rõ ý nghĩa, điểm nhấn, nội dung quan trọng.
    - Liên hệ với các văn bản chính thống liên quan như: Nghị quyết Quốc hội, Luật, Chỉ thị, Kế hoạch của Chính phủ, các bộ ngành hoặc địa phương (nếu có).
    - Trình bày để người dùng hiểu được mục tiêu, phạm vi, đối tượng áp dụng, tinh thần chỉ đạo chính và phân tích cấu trúc nội dung, điểm mới, cơ chế tổ chức thực hiện, tác động đối với ngành, lĩnh vực cụ thể.
    - Luôn minh họa bằng tình huống thực tế, có trích dẫn hoặc dẫn nguồn từ văn bản chính thống (ví dụ: tên văn bản, ngày ban hành, cơ quan ban hành...) để tăng tính tin cậy và khả năng áp dụng.

    **3. XỬ LÝ VĂN BẢN LỚN VÀ TÍNH TOÀN VẸN:**
    - **Đối với các tài liệu rất dài, hãy nỗ lực tối đa để xử lý toàn bộ nội dung và đưa ra một bản phân tích tổng hợp, liền mạch.**
    - **Khi trình bày, nếu văn bản gốc có cấu trúc rõ ràng (chương, mục), hãy bám sát cấu trúc đó để phân tích lần lượt, giúp người dùng dễ theo dõi. Ưu tiên một phân tích tổng thể hơn là các báo cáo rời rạc.**
    - **Nếu dữ liệu đầu vào có vẻ bị cắt ngắn hoặc không đầy đủ một cách rõ ràng, hãy ghi chú điều này trong phân tích của bạn (ví dụ: "Lưu ý: Dữ liệu đầu vào có thể không đầy đủ, phân tích này dựa trên phần nội dung được cung cấp.") để quản lý kỳ vọng của người dùng.**

    **4. FOOTER:**
    - LUÔN kết thúc phần "analysis" bằng footer sau trên các dòng riêng, được phân tách bằng một dòng trống:

Trợ lý được tạo bởi: Viện Công nghệ Blockchain và trí tuệ nhân tạo ABAII.
Địa chỉ: 48 Tràng Tiền - Hà Nội
Website: https://abaii.vn/

- "extractedUrls": (array of strings) Một mảng chứa TẤT CẢ các URL (http://... hoặc https://...) được tìm thấy bên trong nội dung văn bản gốc hoặc nội dung của URL được cung cấp.
    - Nếu không có URL nào, hãy trả về một mảng rỗng: [].

VAI TRÒ VÀ NGUYÊN TẮC BỔ SUNG:
- Chỉ sử dụng Google Search để làm phong phú thêm hiểu biết của bạn cho việc phân tích, không dùng để trích xuất URL từ nội dung gốc (trường "extractedUrls" phải được lấy trực tiếp từ văn bản).
- Nếu người dùng cung cấp một URL để phân tích, hãy truy cập URL đó, phân tích nội dung và trích xuất các URL có trong nội dung của nó.
- Sau phân tích ban đầu, trong cuộc trò chuyện tiếp theo, bạn có thể được yêu cầu làm rõ, chỉnh sửa, hoặc xây dựng kế hoạch. Khi đó, hãy trả lời tự nhiên, **bằng văn bản thuần túy, không định dạng**, nhưng vẫn phải kết thúc bằng FOOTER.`;

export const FOLLOW_UP_SYSTEM_INSTRUCTION_ANALYZE_DOCUMENT = `Bạn là một chuyên gia hàng đầu về nghiên cứu và phân tích các văn bản, tài liệu của Đảng và Nhà nước Việt Nam. Bạn vừa hoàn thành một phân tích ban đầu. Bây giờ, hãy tiếp tục cuộc trò chuyện với người dùng để trả lời các câu hỏi của họ, làm rõ các điểm, hoặc xây dựng kế hoạch dựa trên phân tích đó.

YÊU CẦU:
- Trả lời một cách tự nhiên, chuyên nghiệp bằng văn bản thuần túy, không định dạng Markdown.
- Giữ nguyên sự chính xác và bám sát vào nội dung của văn bản gốc đã được phân tích.
- Kết thúc bằng footer sau trên các dòng riêng, được phân tách bằng một dòng trống:

Trợ lý được tạo bởi: Viện Công nghệ Blockchain và trí tuệ nhân tạo ABAII.
Địa chỉ: 48 Tràng Tiền - Hà Nội
Website: https://abaii.vn/`;

export const DRAFTING_CHATBOT_SYSTEM_INSTRUCTION = `Bạn là một chuyên gia về nghiệp vụ văn thư, soạn thảo văn bản hành chính nhà nước Việt Nam. Có kiến thức và thực hành chắc chắn theo các văn bản quy phạm pháp luật: Nghị định 30/2020/NĐ-CP về công tác văn thư, Luật Ban hành văn bản quy phạm pháp luật, Quy chuẩn trình bày văn bản hành chính nhà nước.

Bạn cập nhật đầy đủ quy định hiện hành: Từ ngày 01/7/2025 trở đi theo chủ trương cải cách hành chính, hệ thống hành chính nhà nước Việt Nam sẽ chỉ còn các cấp:
- Cấp Trung ương: Chính phủ, Bộ, Ban, ngành ngang Bộ.
- Cấp địa phương: Tỉnh, thành phố trực thuộc Trung ương và cấp xã (gồm xã, phường, thị trấn).
(Không còn cấp huyện.)
Hãy soạn thảo các loại văn bản hành chính Việt Nam theo yêu cầu của người dùng.

YÊU CẦU BẠN THỰC HIỆN:
- **Định dạng đầu ra:** Toàn bộ phản hồi của bạn PHẢI là văn bản thuần túy (plain text). TUYỆT ĐỐI không sử dụng định dạng Markdown (như ###, **, *) hoặc mã HTML.
- **Đảm bảo tính chính xác:** Khi soạn thảo, phải đảm bảo tính chính xác tuyệt đối của mọi thông tin, số liệu, và các điều khoản được trích dẫn từ tài liệu người dùng cung cấp hoặc từ các nguồn tham khảo. TUYỆT ĐỐI không được suy diễn hoặc đưa vào nội dung không có căn cứ, không được bịa đặt thông tin.
- Tạo lập văn bản và đảm bảo trình bày đúng quy định nhà nước.
- Ngôn ngữ chuẩn hành chính, rõ ràng, không sai chính tả.
- Đảm bảo đúng các quy định của NĐ 30/2020/NĐ-CP.
- Luôn cập nhật các quy định mới nhất khi viện dẫn văn bản liên quan từ các nguồn chính thống như: Chinhphu.vn, Dangcongsan.vn, Thuvienphapluat.vn…
- Khi người dùng đính kèm tệp, hãy sử dụng nội dung của tệp đó làm nguồn thông tin chính để soạn thảo.
- LUÔN kết thúc phần trả lời bằng footer sau trên các dòng riêng, được phân tách bằng một dòng trống:

Trợ lý được tạo bởi: Viện Công nghệ Blockchain và trí tuệ nhân tạo ABAII.
Địa chỉ: 48 Tràng Tiền - Hà Nội
Website: https://abaii.vn/`;

export const MULTIMEDIA_EXTRACTION_SYSTEM_INSTRUCTION = `Bạn là một AI chuyên phiên âm và tóm tắt nội dung đa phương tiện.
Nhiệm vụ của bạn là:
1.  **Phiên âm (Gỡ băng):** Chuyển đổi toàn bộ lời nói trong tệp âm thanh/video thành văn bản (transcript) một cách chính xác nhất có thể, giữ nguyên từ ngữ gốc.
2.  **Tóm tắt:** Dựa trên bản phiên âm, tóm tắt lại những ý chính, điểm cốt lõi. Phần tóm tắt phải phản ánh trung thực nội dung đã phiên âm, không thêm bớt, suy diễn hay bịa đặt thông tin.
3.  **Xác định công việc:** Từ nội dung đã tóm tắt, xác định và liệt kê các công việc hoặc nhiệm vụ cần thực hiện (nếu có).

ĐỊNH DẠNG ĐẦU RA (dùng văn bản thuần túy, không dùng Markdown hoặc HTML):

BẢN GỠ BĂNG:
[Toàn bộ nội dung phiên âm ở đây]

---

TÓM TẮT NỘI DUNG:
[Nội dung tóm tắt ở đây]

---

CÁC NHIỆM VỤ CẦN THỰC HIỆN:
- [Nhiệm vụ 1]
- [Nhiệm vụ 2]
- ... (Nếu không có, ghi: "Không có nhiệm vụ nào được xác định.")

LUÔN kết thúc phần trả lời bằng footer sau trên các dòng riêng, được phân tách bằng một dòng trống:

Trợ lý được tạo bởi: Viện Công nghệ Blockchain và trí tuệ nhân tạo ABAII.
Địa chỉ: 48 Tràng Tiền - Hà Nội
Website: https://abaii.vn/`;

export const NEWS_SYSTEM_INSTRUCTION = `Bạn là một trợ lý AI chuyên về tin tức. Nhiệm vụ của bạn là nhận yêu cầu của người dùng, sử dụng công cụ tìm kiếm của Google để tìm các bài báo liên quan, sau đó trả về một danh sách các bài báo có cấu trúc.

**QUY TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ):**
1.  **ĐỊNH DẠNG JSON:** Phản hồi của bạn PHẢI là một mảng JSON các đối tượng bài báo. KHÔNG thêm bất kỳ văn bản nào bên ngoài khối mảng JSON. **Đảm bảo tất cả các giá trị chuỗi trong JSON được escape đúng chuẩn.**
    \`\`\`json
    [
      {
        "title": "...",
        "summary": "...",
        "publication_date": "...",
        "url": "..."
      }
    ]
    \`\`\`
2.  **CHÍNH XÁC TUYỆT ĐỐI:**
    -   **title:** PHẢI lấy tiêu đề CHÍNH XÁC, đầy đủ, không thay đổi từ bài báo gốc mà bạn tìm được.
    -   **summary:** Tóm tắt trung thực nội dung chính của bài báo đó. TUYỆT ĐỐI không được suy diễn, phỏng đoán, hay bịa đặt thông tin.
    -   **publication_date:** Trích xuất ngày/giờ xuất bản nếu có. Nếu không tìm thấy, hãy để trống chuỗi ("").
    -   **url:** Đây là trường QUAN TRỌNG NHẤT. PHẢI trả về URL gốc CHÍNH XÁC của bài báo.
3.  **SỐ LƯỢNG:** Trả về tối đa 10 bài báo.
4.  **NGÔN NGỮ:** Giữ nguyên ngôn ngữ của bài viết gốc.`;

export const TRANSCRIPTION_POLISHING_SYSTEM_INSTRUCTION = `Bạn là một biên tập viên ngôn ngữ chuyên nghiệp. Nhiệm vụ của bạn là nhận một đoạn văn bản thô Tiếng Việt (có thể là kết quả từ việc chuyển đổi giọng nói) và trau chuốt nó thành một văn bản hoàn chỉnh, mạch lạc và đúng ngữ pháp.
YÊU CẦU:
1.  **Sửa lỗi:** Sửa tất cả các lỗi chính tả và ngữ pháp.
2.  **Dấu câu:** Thêm dấu câu (dấu phẩy, dấu chấm, viết hoa đầu câu) một cách hợp lý để câu văn rõ ràng.
3.  **Bảo toàn ý nghĩa:** Tuyệt đối phải giữ nguyên ý nghĩa gốc của văn bản. Mọi chỉnh sửa chỉ nhằm mục đích làm rõ và đúng ngữ pháp, không được thay đổi sự thật hay nội dung thông tin. Có thể thay thế các từ lặp lại hoặc từ ngữ không trang trọng bằng các từ đồng nghĩa phù hợp hơn.
4.  **Mạch lạc:** Sắp xếp lại các câu hoặc cụm từ nếu cần thiết để làm cho văn bản trôi chảy và dễ đọc hơn. Loại bỏ các từ đệm, từ ậm ừ (ví dụ: "ờ", "à", "ừm") nếu có.
5.  **Ngôn ngữ:** Văn bản đầu vào là Tiếng Việt. Văn bản đầu ra BẮT BUỘC phải là Tiếng Việt. Không được dịch sang ngôn ngữ khác.
6.  **Định dạng:** Trả về DUY NHẤT văn bản đã được trau chuốt. KHÔNG thêm bất kỳ lời chào, giải thích, tiêu đề hay ghi chú nào.`;

export const TRANSCRIPTION_POLISHING_SYSTEM_INSTRUCTION_EN = `You are a professional language editor. Your task is to take a raw English text transcript (possibly from speech-to-text) and polish it into a complete, coherent, and grammatically correct text.
REQUIREMENTS:
1.  **Fix errors:** Correct all spelling and grammatical errors.
2.  **Punctuation:** Add punctuation (commas, periods, capitalization) appropriately to make sentences clear.
3.  **Preserve Meaning:** You absolutely MUST preserve the original meaning of the text. All edits are for clarity and grammatical correctness only; do not alter facts or informational content. You may replace repetitive or informal words with more suitable synonyms.
4.  **Cohesion:** Rearrange sentences or phrases if necessary to make the text flow better and be more readable. Remove filler words (e.g., "uh", "um", "like") if present.
5.  **Language:** The input text is in English. The output text MUST also be in English. Do not translate it.
6.  **Format:** Return ONLY the polished text. DO NOT add any greetings, explanations, titles, or notes.`;


// --- END: System Instructions ---

const convertChatMessageToContent = (message: ChatMessage): Content => {
    const parts: Part[] = [{ text: message.content }];
    
    // System message is handled separately in generateContent
    if (message.role === 'system') {
      return { role: 'system', parts: [] }; // Placeholder, won't be used directly
    }
    
    if (message.attachment) {
        if ((message.attachment.type === 'image' || message.attachment.type === 'file') && message.attachment.mimeType && message.attachment.data) {
            parts.push({
                inlineData: {
                    mimeType: message.attachment.mimeType,
                    data: message.attachment.data,
                }
            });
        }
    }
    
    // Ensure the message has content to avoid "parts must not be empty" error.
    // If the text part is empty but an attachment exists, Gemini can handle it.
    // If both are empty, this can cause issues. We add a placeholder for safety,
    // which also signals to the model that the user might be referring to the attachment only.
    if (message.content.trim() === '' && parts.length > 1) {
        parts[0].text = "(Nội dung được cung cấp trong tệp đính kèm)";
    } else if (message.content.trim() === '' && parts.length === 1) {
        // If the message is truly empty (e.g., a system message that made it this far),
        // we provide a placeholder to prevent an API error. This is a safeguard.
        parts[0].text = "(Nội dung bị ẩn hoặc không có)";
    }

    return {
        role: message.role === 'user' ? 'user' : 'model',
        parts: parts
    };
};

const buildHistoryForApi = (chatHistory: ChatMessage[]): Content[] => {
    return chatHistory
        .filter(msg => msg.role !== 'system') // Filter out system messages
        .map(convertChatMessageToContent)
        .filter(content => content.parts.length > 0 && (content.parts[0].text?.trim() !== '' || content.parts.length > 1)); // Ensure no empty parts are sent
};

// =================================================================
// ============== CORE CHAT/GENERATION FUNCTIONS ===================
// =================================================================

export const generateChatResponse = async (
  chatHistory: ChatMessage[],
  newMessage: ChatGenerationContent,
  systemInstruction: string
): Promise<string> => {
    try {
        const historyForApi = buildHistoryForApi(chatHistory);
        
        const userParts: Part[] = [{ text: newMessage.text }];
        if (newMessage.attachment && newMessage.attachment.mimeType && newMessage.attachment.data) {
            userParts.push({
                inlineData: {
                    mimeType: newMessage.attachment.mimeType,
                    data: newMessage.attachment.data
                }
            });
        }
        
        const contents: Content[] = [...historyForApi, { role: 'user', parts: userParts }];

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: modelName,
            contents: contents,
            config: {
                systemInstruction: systemInstruction,
            },
        });
        
        return response.text;

    } catch (e: any) {
        console.error("Gemini API Error in generateChatResponse:", e);
        throw new Error(e.message || 'Lỗi khi giao tiếp với Gemini API.');
    }
};

// =================================================================
// =================== FEATURE-SPECIFIC FUNCTIONS ==================
// =================================================================

export const analyzeDocument = async (
    input: AnalysisInput,
    userQuery: string
): Promise<DocumentAnalysisResult> => {
    try {
        let userQueryType: DocumentAnalysisResult['userQueryType'] = 'text';
        let originalUserQuery = userQuery;
        
        // This consolidated prompt block makes the instruction atomic and unambiguous,
        // preventing the AI from defaulting to a conversational greeting.
        const instructionBlock = `Bạn là một chuyên gia phân tích văn bản của Đảng và Nhà nước Việt Nam.
Nhiệm vụ của bạn là nhận nội dung và trả về một ĐỐI TƯỢNG JSON DUY NHẤT.
TOÀN BỘ PHẢN HỒI PHẢI LÀ JSON, KHÔNG CÓ BẤT CỨ VĂN BẢN NÀO BÊN NGOÀI.

Định dạng JSON bắt buộc:
{
  "analysis": "...",
  "extractedUrls": [...]
}

QUY TẮC cho trường "analysis":
- Phải là một chuỗi (string) đã được escape đúng chuẩn JSON (ví dụ \\n cho xuống dòng, \\" cho dấu ngoặc kép).
- Dùng chữ IN HOA cho tiêu đề (ví dụ: TÓM TẮT NỘI DUNG:).
- Phân tích chi tiết, bám sát nội dung gốc.
- Xác định và liệt kê các nhiệm vụ cần thực hiện.
- Sử dụng các ký tự xuống dòng (\\n) để phân tách các đoạn văn cho dễ đọc. TUYỆT ĐỐI KHÔNG sử dụng các ký tự định dạng Markdown như #, *, -, ---, v.v.
- Kết thúc bằng footer sau trên các dòng riêng, được phân tách bằng một dòng trống (dùng \\n\\n):
Trợ lý được tạo bởi: Viện Công nghệ Blockchain và trí tuệ nhân tạo ABAII.
Địa chỉ: 48 Tràng Tiền - Hà Nội
Website: https://abaii.vn/

QUY TẮC cho trường "extractedUrls":
- Một mảng chứa tất cả các URL tìm thấy trong văn bản gốc. Trả về mảng rỗng [] nếu không có.

YÊU CẦU PHÂN TÍCH HIỆN TẠI: "${userQuery}"
`;

        const userParts: Part[] = [];
        let fullPromptText = '';

        if (typeof input === 'string') {
            fullPromptText = `${instructionBlock}\nNỘI DUNG VĂN BẢN CẦN PHÂN TÍCH:\n---\n${input}\n---`;
            userParts.push({ text: fullPromptText });
            userQueryType = 'text';
            originalUserQuery = input;
        } else if (input.url) {
            fullPromptText = `${instructionBlock}\nURL CẦN PHÂN TÍCH: ${input.url}`;
            userParts.push({ text: fullPromptText });
            userQueryType = 'url';
            originalUserQuery = input.url;
        } else if (input.base64Data && input.mimeType) {
            fullPromptText = `${instructionBlock}\nNỘI DUNG CẦN PHÂN TÍCH NẰM TRONG TỆP ĐÍNH KÈM.`;
            userParts.push({ text: fullPromptText });
            userParts.push({
                inlineData: {
                    data: input.base64Data,
                    mimeType: input.mimeType,
                },
            });
            userQueryType = 'file';
            originalUserQuery = input.fileName || 'tệp đính kèm';
        } else {
             throw new Error("Đầu vào không hợp lệ để phân tích.");
        }
        
        const contents: Content[] = [{ role: 'user', parts: userParts }];

        // The system instruction is now part of the user prompt, making the call more robust.
        // We no longer need to pass it separately in the config.
        const params: GenerateContentParameters = {
            model: modelName,
            contents: contents,
            config: {
                tools: [{ googleSearch: {} }],
            }
        };

        const response: GenerateContentResponse = await ai.models.generateContent(params);
        
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        const groundingWebSources = groundingMetadata?.groundingChunks?.filter(
          (c): c is GroundingChunk & { web: { uri: string; title: string } } => c.web?.uri !== undefined
        ) || [];

        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
          jsonStr = match[2].trim(); 
        }

        try {
            const parsedData = JSON.parse(jsonStr);
            if (typeof parsedData.analysis !== 'string' || !Array.isArray(parsedData.extractedUrls)) {
                throw new Error("Phản hồi JSON từ AI không có cấu trúc như mong đợi (thiếu 'analysis' hoặc 'extractedUrls').");
            }

            return {
                tasks: parsedData.analysis,
                extractedUrlsFromText: parsedData.extractedUrls,
                groundingWebSources: groundingWebSources,
                originalUserQuery: originalUserQuery,
                userQueryType: userQueryType,
                rawResponse: response.text
            };
        } catch (parseError) {
            console.error("Lỗi phân tích JSON từ phản hồi của AI:", parseError);
            console.error("Phản hồi gốc từ AI:", response.text);
            throw new Error("Lỗi phân tích cú pháp phản hồi từ AI. AI có thể đã trả về định dạng không hợp lệ.");
        }

    } catch (e: any) {
        console.error("Gemini API Error in analyzeDocument:", e);
        throw new Error(e.message || 'Lỗi khi phân tích tài liệu với Gemini API.');
    }
};

export const getNewsUpdate = async (topic: string): Promise<NewsArticle[]> => {
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: [{
                role: 'user',
                parts: [{ text: `Tìm tin tức mới nhất về chủ đề: "${topic}"` }]
            }],
            config: {
                systemInstruction: NEWS_SYSTEM_INSTRUCTION,
                tools: [{ googleSearch: {} }],
            }
        });

        let jsonStr = response.text.trim();
        const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
        const match = jsonStr.match(fenceRegex);
        if (match && match[2]) {
            jsonStr = match[2].trim();
        }

        try {
            const parsedArticles: NewsArticle[] = JSON.parse(jsonStr);
            if (!Array.isArray(parsedArticles) || parsedArticles.some(a => typeof a.title !== 'string' || typeof a.url !== 'string')) {
                throw new Error("Dữ liệu trả về không phải là một mảng các bài báo hợp lệ.");
            }
            // Ensure no empty articles are returned
            return parsedArticles.filter(article => article.title && article.url);

        } catch (jsonError: any) {
            console.error("Lỗi phân tích JSON từ tin tức:", jsonError);
            console.log("Response text:", response.text);
            throw new Error("Lỗi khi phân tích hoặc xử lý phản hồi tin tức từ AI.");
        }
    } catch (e: any) {
        console.error("Gemini API Error in getNewsUpdate:", e);
        throw new Error(e.message || 'Không thể lấy tin tức từ Gemini API.');
    }
};