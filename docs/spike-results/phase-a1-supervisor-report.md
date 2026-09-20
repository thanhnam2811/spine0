# Báo cáo Nghiệm thu R&D Spike: 2D Character Animation Factory (Phase A.1)

**Đối tượng thẩm định**: Supervisor Agent / Lead Architect  
**Mã dự án**: `spine0` (`animation-factory`)  
**Repository**: [github.com/thanhnam2811/spine0](https://github.com/thanhnam2811/spine0) (`main`)  
**Giấy phép**: [MIT License](file:///G:/PERSONAL/spine0/LICENSE)  
**Thời gian hoàn thành**: 2026-09-20  
**Kết luận nghiệm thu Phase A.1**: **`RIG-FAMILY ENGINEERING PASS`**  
**Trạng thái hoàn thành**: **`VERIFIED`**  
**Đề xuất chuyển giai đoạn**: **`CHẤP THUẬN TIẾN HÀNH PHASE B (MINIMAL RIG ADJUSTER)`**  
**Lệnh dừng hiện tại**: **DỪNG TOÀN BỘ TRIỂN KHAI** — Chờ Supervisor phê duyệt trước khi lập kế hoạch và khởi động Phase B.

---

## 1. Mục đích Thực nghiệm Phase A.1

Trong Phase A, kết luận sơ bộ đã bị dán nhãn `RIG-FAMILY ENGINEERING PASS` trước khi thẩm định độc lập hệ thống Rig Family với dữ liệu holdout thực sự mới. Hai mẫu thử thách `test-c` và `test-e` là nguyên nhân trực tiếp hình thành ý niệm về các family `HumanoidHeavy` và `HumanoidSmall`, do đó không thể coi là tập kiểm thử độc lập (tránh lỗi ngụy biện vòng tròn).

**Mục tiêu của Phase A.1**:
- Khép lại lỗ hổng phương pháp luận (methodological gap) của Phase A.
- Đóng băng cấu trúc toán học của hệ thống 3 Rig Family (`HumanoidNormal`, `HumanoidHeavy`, `HumanoidSmall`) cùng envelopes và animations.
- Tiến hành đo kiểm trên một tập holdout hoàn toàn mới gồm 6 archetype chưa từng xuất hiện trong quá trình calibration.
- Xác thực xem hệ thống Rig Family có thực sự phân loại chính xác, ngăn chặn xuyên thủng/lơ lửng và cho phép tái sử dụng animation 100% hay không.

---

## 2. Kỷ luật Thực nghiệm: Ba Tầng Phân Lập

```text
1. BỘ HIỆU CHUẨN MỞ RỘNG (Calibration Set)
   - dev-a, dev-b, dev-c  -> Hiệu chuẩn HumanoidNormal
   - test-c               -> Hiệu chuẩn HumanoidHeavy
   - test-e               -> Hiệu chuẩn HumanoidSmall

2. CỔNG ĐÓNG BĂNG MẬT MÃ (Freeze Gate)
   - docs/spike-results/phase-a1-freeze-manifest.json
   - Khóa cứng SHA-256: 3 Rigs, 3 Envelopes, 7 Animation Templates.

3. TẬP THỬ THÁCH HOLDOUT MỚI (Untouched Holdout Set)
   - fixtures/family-challenge/
   - normal-01, normal-02 (Kiếm tu / Đạo cô áo lụa chuẩn)
   - heavy-01,  heavy-02  (Chiến binh cự khiên & Cuồng chiến đao to)
   - small-01,  small-02  (Sát thủ halfling & Kỹ sư dwarf chùy cơ quan)
   - Cam kết: Không thay đổi bất kỳ asset nào đã đóng băng khi chạy holdout test.
```

---

## 3. Kiến trúc Hệ thống 3 Rig Family

Hệ thống tuân thủ nghiêm ngặt các bất biến kỹ thuật:
1. **Topology 17 xương bất biến**: Mọi family dùng chung cây phả hệ xương và slot contract. Không can thiệp code engine `anim-core`.
2. **Khác biệt hoàn toàn hướng dữ liệu (Data-driven)**:
   - `HumanoidNormal` (`humanoid-normal-v1`): Tỷ lệ chuẩn (thân 180, sọ 140, khoảng vai 40, chân 420).
   - `HumanoidHeavy` (`humanoid-heavy-v1`): Thân đẫy đà (thân 210, khoảng vai rộng 78-86, khoảng hông 84-88, cổ ngắn 35).
   - `HumanoidSmall` (`humanoid-small-v1`): Tỷ lệ chibi/lùn (sọ to 250-260, thân 150, chân ngắn 270, trọng tâm thấp).
3. **Biên Envelope loại trừ tương hỗ (Mutually Exclusive Envelopes)**:
   - `shoulder_span_to_height`: Normal $[0.025, 0.070]$ vs Heavy $[0.070, 0.110]$.
   - `head_to_height`: Normal $[0.14, 0.22]$ vs Small $[0.22, 0.32]$.
   - `total_leg_to_height`: Normal $[0.38, 0.48]$ vs Small $[0.22, 0.35]$.

---

## 4. Kết quả Ma trận Thử thách Holdout Phase A.1

Đo kiểm tự động qua runner [`tests/family-challenge-evaluation.test.ts`](file:///G:/PERSONAL/spine0/tests/family-challenge-evaluation.test.ts):

| Mẫu Holdout | Archetype | Rig Chỉ định | Envelope Phân bổ | Khả năng Phân loại Biên (Bị loại bởi 2 family khác) | Tái sử dụng `idle` (Shared) | Tái sử dụng `run` (Family) | Tái sử dụng `slash` (Family) | Dynamic Draw Order | Tỷ lệ Override Trọng yếu |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`normal-01`** | Azure Spearman | `humanoid-normal-v1` | **PASS** | **PASS** (100% Loại trừ) | **PASS** | **PASS** | **PASS** | $[15 \to 110 \to 15]$ **PASS** | **0.0%** (0/17) |
| **`normal-02`** | Silk Ribbon Priestess | `humanoid-normal-v1` | **PASS** | **PASS** (100% Loại trừ) | **PASS** | **PASS** | **PASS** | $[15 \to 110 \to 15]$ **PASS** | **5.9%** (1/17) |
| **`heavy-01`** | Iron Citadel Guardian | `humanoid-heavy-v1` | **PASS** | **PASS** (100% Loại trừ) | **PASS** | **PASS** | **PASS** (Clear giáp vai) | $[15 \to 110 \to 15]$ **PASS** | **0.0%** (0/17) |
| **`heavy-02`** | Obsidian Marauder | `humanoid-heavy-v1` | **PASS** | **PASS** (100% Loại trừ) | **PASS** | **PASS** | **PASS** (Clear giáp vai) | $[15 \to 110 \to 15]$ **PASS** | **0.0%** (0/17) |
| **`small-01`** | Shadow Halfling Rogue | `humanoid-small-v1` | **PASS** | **PASS** (100% Loại trừ) | **PASS** | **PASS** (Không trượt chân) | **PASS** (Clear vòm sọ) | $[15 \to 110 \to 15]$ **PASS** | **0.0%** (0/17) |
| **`small-02`** | Clockwork Dwarf Tinkerer | `humanoid-small-v1` | **PASS** | **PASS** (100% Loại trừ) | **PASS** | **PASS** (Không trượt chân) | **PASS** (Clear vòm sọ) | $[15 \to 110 \to 15]$ **PASS** | **0.0%** (0/17) |

---

## 5. Chỉ số Đo lường Máy móc (Machine-Measurable Metrics)

1. **Thao tác Override thiết lập (Setup Operations)**:
   - Trung bình chỉ **4.5 thao tác** cho một nhân vật mới.
   - Tỷ lệ material override tối đa: **5.9%** (1 xương trên `normal-02`), cách rất xa ngưỡng chặn $40\%$ (`RIG_OVERRIDE_RATIO_HIGH`).
2. **Hiệu suất Tái sử dụng Template**:
   - `idle`: **100% (6/6)** dùng chung 1 template duy nhất ([`assets/animations/shared/idle.anim.json`](file:///G:/PERSONAL/spine0/assets/animations/shared/idle.anim.json)).
   - `run`: **100% (6/6)** dùng chung trong từng family profile.
   - `slash`: **100% (6/6)** vung vũ khí mượt mà, chuyển đổi dynamic draw order chính xác, giải quyết triệt để lỗi xuyên thủng giáp vai (Heavy) và chém vào đầu (Small).
3. **Chỉ số công khai chưa đo kiểm**:
   - `Human Adjustment Time`: **NOT MEASURED** (Bảo lưu cho Phase B đo kiểm trên UI).
   - `Generative AI Texture Yield`: **NOT MEASURED** (Không đánh giá cảm tính khi chưa có pipeline AI sinh ảnh).

---

## 6. Bộ Bằng chứng Kỹ thuật Đã Xác thực (35/35 Tests Green)

- [`packages/anim-core/tests/anim-core.test.ts`](file:///G:/PERSONAL/spine0/packages/anim-core/tests/anim-core.test.ts): 11 tests (FK solver, shortest-angle, dynamic draw order).
- [`packages/validator/tests/validator.test.ts`](file:///G:/PERSONAL/spine0/packages/validator/tests/validator.test.ts): 6 tests (kiểm tra tĩnh, pivot/anchor, override limit).
- [`packages/validator/tests/family-validation.test.ts`](file:///G:/PERSONAL/spine0/packages/validator/tests/family-validation.test.ts): 4 tests (phân loại và loại trừ chéo giữa các family).
- [`tests/calibration.test.ts`](file:///G:/PERSONAL/spine0/tests/calibration.test.ts): 3 tests (Phase A calibration baseline).
- [`tests/challenge-evaluation.test.ts`](file:///G:/PERSONAL/spine0/tests/challenge-evaluation.test.ts): 1 test (Phase A challenge set lịch sử nguyên vẹn).
- [`tests/family-calibration.test.ts`](file:///G:/PERSONAL/spine0/tests/family-calibration.test.ts): 3 tests (Calibration mở rộng cho Heavy & Small).
- [`tests/family-challenge-evaluation.test.ts`](file:///G:/PERSONAL/spine0/tests/family-challenge-evaluation.test.ts): 1 test (Ma trận holdout 6 nhân vật mới).
- [`packages/compiler/tests/compiler.test.ts`](file:///G:/PERSONAL/spine0/packages/compiler/tests/compiler.test.ts): 3 tests (Biên dịch tất định).
- [`packages/runtime-pixi/tests/parity.test.ts`](file:///G:/PERSONAL/spine0/packages/runtime-pixi/tests/parity.test.ts): 3 tests (Độ khớp số học PixiJS runtime với Evaluator $\Delta < 10^{-4}$).
- `pnpm typecheck` (`tsc -b`) và `pnpm build` (`vite build`) đạt exit code 0.

---

## 7. Đề xuất Quyết định cho Supervisor Agent

1. **Nghiệm thu kết quả Phase A.1**: Phê chuẩn xếp hạng **`RIG-FAMILY ENGINEERING PASS`**.
2. **Cho phép triển khai Phase B (Minimal Rig Adjuster)**:
   - Cơ sở kỹ thuật: Việc tái sử dụng animation qua hệ thống 3 family đã được chứng minh là khả thi tuyệt đối. Khâu tốn công nhất hiện nay là căn chỉnh pivot, anchor và setup overrides bằng tay trên JSON.
   - Ứng dụng `apps/editor/` sẽ chỉ tập trung giải quyết đúng bài toán này (visual pivot/anchor editor + undo/redo).
   - Tuyệt đối tuân thủ ranh giới cấm: không timeline, không keyframe dán nhãn, không IK, không mesh deformation.

Kính trình Supervisor Agent thẩm định và phê duyệt!
