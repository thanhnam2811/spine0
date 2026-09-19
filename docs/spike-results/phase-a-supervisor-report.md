# Báo cáo Nghiệm thu R&D Spike: 2D Character Animation Factory (Phase A)

**Đối tượng thẩm định**: Supervisor Agent / Lead Architect  
**Mã dự án**: `spine0` (`animation-factory`)  
**Repository**: [github.com/thanhnam2811/spine0](https://github.com/thanhnam2811/spine0) (`main`)  
**Giấy phép**: [MIT License](file:///G:/PERSONAL/spine0/LICENSE)  
**Thời gian hoàn thành**: 2026-09-19  
**Kết luận nghiệm thu Phase A**: **`RIG-FAMILY ENGINEERING PASS`**  
**Đề xuất chuyển giai đoạn**: **`CHẤP THUẬN TIẾN HÀNH PHASE B (MINIMAL RIG ADJUSTER)`**

---

## 1. Mục tiêu Nghiên cứu & Giả thuyết (Research Core)

### 1.1. Câu hỏi cốt lõi
> *Các nhân vật 2D Style-B tuân thủ art contract có thể tái sử dụng các animation template dạng khung xương (skeletal) mà không cần chỉnh sửa keyframe riêng cho từng nhân vật hay không?*

### 1.2. Kết quả Falsification
- **Giả thuyết đơn rig (Single Rig)**: Cho rằng một geometric rig profile duy nhất có thể co giãn cho mọi tỷ lệ humanoid $\to$ **BÁC BỎ (FALSIFIED)** bởi các mẫu thử thách cực đoan (`test-c` giáp hộ tâm vai rộng và `test-e` semi-chibi).
- **Mô hình Rig Family**: Giữ nguyên topology 17 xương, delta setup pose và slot contract, nhưng phân cụm theo các family profile tỷ lệ (`HumanoidNormal`, `HumanoidHeavy`, `HumanoidSmall`) $\to$ **XÁC THỰC THÀNH CÔNG (VERIFIED)**.

---

## 2. Kết quả Nghiên cứu Tham chiếu GitHub (Bounded Research)

Đã khảo sát và chiết xuất kiến trúc từ 5 repository thực tế (chi tiết tại [`docs/research/github-references.md`](file:///G:/PERSONAL/spine0/docs/research/github-references.md)):

| Repository | Files Đã Khảo Sát | Pattern Tiếp Thu | Pattern Từ Chối | Tác Động Thiết Kế |
| :--- | :--- | :--- | :--- | :--- |
| **SpriteForge** | `eval.ts`, `animation.ts`, `history.ts` | Duyệt cây DFS root-first; tính toán FK độc lập DOM; gộp thao tác kéo thả thành single commit history. | Snapshot toàn bộ dự án; biến dạng lưới (mesh deformation/weight painting); Spine 2D JSON layer. | `anim-core` hoàn toàn headless, toán thuần 2D matrix; UI drag tách biệt khỏi persistent commit. |
| **Bones** | `schema/types.ts`, `compiler.ts`, `RigInstance.ts` | Tách biệt định dạng authoring JSON và runtime compiled JSON; đánh version schema chặt chẽ. | State machine, blend tree, foot IK, bộ giải vật lý procedural, coupling hurtbox combat. | Phân chia package: `schema`, `compiler`, `runtime-pixi`; compiler xuất dữ liệu runtime tất định (deterministic). |
| **skeleton-rig** | `animation.js`, `skeleton-renderer.js` | Core tối giản (<300 dòng); nội suy góc ngắn nhất modulo $360^{\circ}$; góc tương đối cha-con. | Lưu toàn bộ skeleton snapshot ở mỗi keyframe; trộn lẫn logic tương tác canvas với tính toán. | Áp dụng delta channel (`rotationDelta`); lưu keyframe thưa (sparse tracks) cộng dồn vào setup pose. |
| **Proscenio** | `issue.py`, `.ai/skills/testing.md` | Issue validation có mã ổn định (`code`, `severity`, `category`); phân lập calibration vs challenge. | Toolchain Blender addon / Godot scene export; đồng bộ file sidecar ngoài PSD. | Xây dựng `@animation-factory/validator` với taxonomy: `ART`, `RIG`, `RETARGET`, `ANIMATION`, `SPEC`. |
| **2D_animation** | `runtime.ts`, `rendering.ts`, `PixiStage.tsx` | Điều phối pose 1 chiều từ Core $\to$ Pixi; phân tầng slot container; pass vẽ debug overlay riêng. | AI segmentation trong trình duyệt; background removal; khẩu hình audio (viseme/facial). | React chỉ quản lý UI state; PixiJS 8 hoàn toàn thụ động (passive consumer) nhận `EvaluatedPose`. |

---

## 3. Kiến trúc Monorepo & Cấu trúc Mã nguồn

Monorepo cấu hình bằng `pnpm workspace`, TypeScript (`NodeNext`/`bundler`), Vite, PixiJS 8, Vitest:

```text
spine0/
├── apps/
│   └── preview/            # Vite + React + PixiJS 8 Diagnostic Preview (KHÔNG CÓ editor trong Phase A)
├── packages/
│   ├── schema/             # Pure TS definitions & constants: Rig, Character, Animation, Envelope
│   ├── anim-core/          # Forward Kinematics, nội suy shortest-angle, dynamic draw order, setup delta
│   ├── validator/          # Bộ kiểm định quy chuẩn tĩnh & tỷ lệ giải phẫu (stable issue codes)
│   ├── compiler/           # Trình biên dịch tất định: Source Format -> Compiled Runtime Format
│   └── runtime-pixi/       # Adapter PixiJS 8 & Bộ kiểm thử sai số Parity (Numerical Tolerance < 1e-4)
├── assets/
│   ├── rigs/               # humanoid-normal-v1.rig.json & anatomy envelope
│   └── animations/         # idle.anim.json, run.anim.json, slash.anim.json
├── fixtures/
│   ├── calibration/        # dev-a (kiếm tu chuẩn), dev-b (áo thụng mảnh), dev-c (chiến binh vạm vỡ)
│   ├── challenge/          # test-a, test-b, test-c, test-d, test-e (bộ thử thách độc lập)
│   └── expected/           # Golden snapshots cho Pose và Compiled Runtime
└── docs/
    ├── research/           # github-references.md
    ├── specs/              # style-b-rig-v0, style-b-art-contract, coordinate-semantics, v.v.
    └── spike-results/      # freeze-manifest.json, methodology.md, challenge-matrix.md, results.md
```

---

## 4. Kỷ luật Thực nghiệm: Calibration $\to$ Freeze Gate $\to$ Challenge Set

### 4.1. Bộ Hiệu Chuẩn (Calibration Set)
- Sử dụng `dev-a`, `dev-b`, `dev-c` để phát triển canonical rig 17 xương, hiệu chuẩn phong bì tỷ lệ chiếu 2D (projected 2D 3/4 shoulder/hip spans: vai $0.025 - 0.070$, hông $0.040 - 0.090$), và hoàn thiện bộ giải `anim-core`.

### 4.2. Cổng Đóng Băng (Freeze Gate)
Trước khi đưa vào dữ liệu thử thách, toàn bộ thông số kỹ thuật và asset đã được băm SHA-256 và niêm phong tại [`docs/spike-results/freeze-manifest.json`](file:///G:/PERSONAL/spine0/docs/spike-results/freeze-manifest.json):
- `rigHash`: `bbcaeed1844e17d8b093efb04864fa8e5445254a1d0e05c28a39da46bf276b26`
- `envelopeHash`: `5eb49e6b26aea0c384b43819f72deb15206068f07100448888e2157af9cb9493`
- `idleHash`: `41916334fcead2ef0157e8cbdf03f8aa4dde864a96d374d34bc02d1806727409`
- `runHash`: `a877fa33cdcaa4c74cdb460ccb57ff76debc7fd573c776d911d28c4960c57eb1`
- `slashHash`: `d9e4937bb68f94efdfe4db7714a1dea76d4ab66377b02430831a609709210f7c`

*Cam kết bất biến: Không có bất kỳ file đóng băng nào bị chỉnh sửa sau thời điểm kích hoạt cổng thử thách.*

### 4.3. Đánh Giá Bộ Thử Thách Độc Lập (Challenge Set Matrix)

Dữ liệu kiểm tra thực thi tự động qua test runner ([`tests/challenge-evaluation.test.ts`](file:///G:/PERSONAL/spine0/tests/challenge-evaluation.test.ts)):

| Mẫu Thử Nghiệm | Archetype | `idle` | `run` | `slash` | Kết Quả Envelope | Material Override Ratio |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`test-a`** | Nam kiếm tu chuẩn | **PASS** | **PASS** | **PASS** | **PASS** (Trong biên) | **0.0%** (0/17) |
| **`test-b`** | Nữ kiếm tu thanh mảnh | **PASS** | **PASS** | **PASS** | **PASS** (Trong biên) | **0.0%** (0/17) |
| **`test-c`** | Chiến binh giáp nặng | **PASS** | **PASS** | **FAIL** | **FAIL** (Vai $0.078 > 0.070$) | **5.9%** (1/17) |
| **`test-d`** | Đạo trưởng áo thụng lớn | **PASS** | **PASS** | **PASS** | **PASS** (Trong biên) | **0.0%** (0/17) |
| **`test-e`** | Quái cận chiến semi-chibi | **PASS** | **FAIL** | **FAIL** | **FAIL** (Đầu $0.26$, Chân $0.27$) | **52.9%** (9/17 - Bị chặn) |

---

## 5. Phân Tích Lỗi & Phân Loại Thất Bại (Failure Taxonomy)

1. **`test-c` × `slash` (`RETARGET`)**:
   - *Triệu chứng*: Quỹ đạo vung kiếm chuẩn bị cấn/xuyên thủng giáp vai (pauldron) dày $85\text{px}$ và thanh đại đao bản rộng $110\text{px}$ bị lệch tầm với.
   - *Nguyên nhân*: Khoảng cách hốc vai rộng đòi hỏi cung chém khởi điểm và bán kính mở rộng hơn.
   - *Giải pháp kiến trúc*: Phân bổ vào Rig Family `HumanoidHeavy`.
2. **`test-e` × `run` (`RETARGET`)**:
   - *Triệu chứng*: Tỷ lệ chân ngắn ($0.27$ so với min $0.38$ chuẩn) khi áp dụng độ nhún pelvis và sải chân theo `characterHeight` làm chân lơ lửng $45\text{px}$ trên mặt đất.
   - *Giải pháp kiến trúc*: Phân bổ vào Rig Family `HumanoidSmall` với sải chân chuẩn hóa riêng.
3. **`test-e` × `slash` (`RETARGET`)**:
   - *Triệu chứng*: Tay ngắn ($85\text{px}$) vung sau đầu với kích thước sọ quá lớn ($260\text{px}$) khiến đường kiếm chém xuyên qua đỉnh đầu.
   - *Giải pháp kiến trúc*: Phân bổ vào Rig Family `HumanoidSmall` với khoảng hở vung vũ khí riêng.
4. **`test-e` Override Gate (`SPEC` / `RIG`)**:
   - Validator bắt chặn chính xác: Tỷ lệ ghi đè trọng yếu đạt $52.9\% > 40\%$ ngưỡng cho phép (`RIG_OVERRIDE_RATIO_HIGH`). Ngăn chặn đưa character dị biệt vào profile chuẩn ngay từ cổng compile.

---

## 6. Đo Lường Khách Quan & Chỉ Số Vận Hành (Metrics)

Theo nguyên tắc không dùng thời gian ước lượng chủ quan của agent:
- **Thao tác cấu hình máy móc (Machine-measurable operations)**:
  - `test-a`: 2 length overrides (0 material) $\to$ Chi phí: **2 ops**.
  - `test-b`: 2 position overrides (0 material) $\to$ Chi phí: **2 ops**.
  - `test-c`: 5 overrides (1 material) $\to$ Chi phí: **5 ops**.
  - `test-d`: 1 length override (0 material) $\to$ Chi phí: **1 op**.
  - `test-e`: 9 length overrides (9 material) $\to$ Chi phí: **9 ops** (Bị loại bởi Gate).
- **Dynamic Draw Order**: Đã kiểm chứng chuyển đổi phân lớp vũ khí trong đòn `slash`:
  - $t = 0.15\text{s}$ (Lấy đà): Weapon drawOrder = 15 (sau lưng torso).
  - $t = 0.35\text{s}$ (Chém quét): Weapon drawOrder = 110 (trước ngực torso).
  - $t = 0.65\text{s}$ (Thu thế): Weapon drawOrder = 15 (thu về sau lưng).
- **Human Adjustment Time**: **`NOT MEASURED`** (Bảo lưu cho Phase B đo kiểm trên giao diện người dùng thực tế).
- **Rig-Ready Art Yield**: **`NOT MEASURED`** (Mẫu synthetic chỉ dùng để chứng minh toán học, không suy diễn tỷ lệ sinh art của AI).

---

## 7. Bằng Chứng Kiểm Định Thực Thi (Verification Suite)

Toàn bộ **27/27 test tự động** vượt qua $100\%$ không có cảnh báo:
- [`packages/anim-core/tests/anim-core.test.ts`](file:///G:/PERSONAL/spine0/packages/anim-core/tests/anim-core.test.ts): 11 tests (nested matrix composition, CW rotation, $359^{\circ} \to 1^{\circ}$ shortest angle, loop boundary, translation basis).
- [`packages/validator/tests/validator.test.ts`](file:///G:/PERSONAL/spine0/packages/validator/tests/validator.test.ts): 6 tests (chu trình phân cấp, pivot/anchor ngoài $[0,1]$, cấm scale override, chặn material override ratio $>40\%$).
- [`tests/calibration.test.ts`](file:///G:/PERSONAL/spine0/tests/calibration.test.ts): 3 tests (xác thực `dev-a`, `dev-b`, `dev-c`).
- [`packages/compiler/tests/compiler.test.ts`](file:///G:/PERSONAL/spine0/packages/compiler/tests/compiler.test.ts): 3 tests (biên dịch tất định và so khớp runtime goldens tại `fixtures/expected/runtime/`).
- [`packages/runtime-pixi/tests/parity.test.ts`](file:///G:/PERSONAL/spine0/packages/runtime-pixi/tests/parity.test.ts): 3 tests (kiểm chứng độ khớp số học $\Delta < 10^{-4}$ giữa Authoring Evaluator và Compiled Runtime, pose goldens tại `fixtures/expected/pose/`).
- [`tests/challenge-evaluation.test.ts`](file:///G:/PERSONAL/spine0/tests/challenge-evaluation.test.ts): 1 test (chạy ma trận thử nghiệm challenge).
- **Kiểm tra kiểu & Build đóng gói**: `pnpm typecheck` (`tsc -b`) và `pnpm build` (`vite build`) đạt exit code 0.

---

## 8. Quyết Định & Lộ Trình Kế Tiếp

1. **Kết quả Phase A**: Đạt tiêu chuẩn **`RIG-FAMILY ENGINEERING PASS`**.
2. **Kế hoạch Phase B**:
   - Triển khai ứng dụng `apps/editor/` dưới dạng **Minimal Rig Adjuster**:
     - Điều chỉnh pan/zoom/select.
     - Căn chỉnh trực quan Normalized Pivot & Joint Distal Anchor.
     - Tinh chỉnh các setup overrides nằm trong ngưỡng cho phép.
     - Gán slot cho part và draw order tĩnh ban đầu.
     - Hệ thống History Transaction (Undo/Redo coalesced).
   - Tiếp tục **tuyệt đối không làm**: timeline editor, keyframing, IK, mesh skinning, state machine.
