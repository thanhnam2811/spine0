import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

const promptText = `BÁO CÁO NGHIỆM THU ĐỘC LẬP & YÊU CẦU ADVERSARIAL SUPERVISOR RE-REVIEW
Dự án: spine0 / animation-factory
Repository: https://github.com/thanhnam2811/spine0
Commit trên main: c556b84 (https://github.com/thanhnam2811/spine0/commit/c556b84)

Chào Supervisor,
Tôi đã hoàn thành 100% việc giải quyết toàn bộ 8 findings (P0-1, P0-2, P0-3, P0-4, P1-1, P1-2, P1-3, P1-4) từ đợt review trước đối với Phase C.1 Stage 1 Gate Hardening. Toàn bộ mã nguồn, fixtures, tests, báo cáo, và screenshots thực tế đã được commit (c556b84) và push sạch sẽ lên origin/main.

Dưới đây là chi tiết bằng chứng kỹ thuật giải quyết từng finding:

============================================================
1. P0-1: VIEWPORT REAL ARTWORK RENDERING
============================================================
- Vấn đề trước đây: Viewport.tsx chỉ vẽ bone line/circle bằng Graphics; không render sprite texture thật của character.
- Giải pháp đã triển khai:
  + Tạo \`apps/editor/src/textureResolver.ts\` dùng Vite \`import.meta.glob\` để resolve và preload toàn bộ 16 textures thật từ \`fixtures/real-production/\`.
  + Tích hợp \`PixiCharacterInstance\` trực tiếp vào Pixi scene tree của \`Viewport.tsx\` (\`cameraContainerRef\`).
  + Trong \`renderScene()\`, gọi \`charInstanceRef.current.applyPose(pose, { showBones: false, showAnchors: false })\`, render đồng thời tất cả 16 part sprites với texture thực tế, vị trí FK chính xác, và sắp xếp theo setup slot drawOrder.
  + Chụp 5 screenshots thực tế từ browser thật bằng \`agent-browser\` và commit vào \`docs/phase-c1/evidence/screenshots/\`:
    * \`editor-real-normal-01.png\`: Wuxia Sword Cultivator hiển thị đầy đủ 16 bộ phận minh họa Style-B (đầu, thân, tà áo, tay, kiếm jian, chân).
    * \`editor-real-normal-01-part-selected.png\`: Chọn \`forearm_R\`, hiển thị bounding box xanh ngọc, pivot handle, distal anchor diamond, và bảng Inspector bên phải.
    * \`editor-real-heavy-01.png\`: Iron Vanguard Juggernaut với giáp sắt nặng và rìu chiến.
    * \`editor-real-small-01.png\`: Hooded Shadow Rogue với áo da và dao găm.

============================================================
2. P0-2: PART-LEVEL FK TRANSFORMS VS SLOT MAPPING
============================================================
- Vấn đề trước đây: Các parts trong cùng 1 slot (như upper_arm_R, forearm_R, hand_R cùng trỏ vào slot_arm_near) bị ghi đè lên nhau ở cùng 1 root bone transform trong anim-core.
- Giải pháp đã triển khai:
  + Cập nhật \`packages/schema/src/types.ts\`: Thêm \`bone?: string\` vào \`PartDefinition\`, định nghĩa \`EvaluatedPartPose\`, và thêm \`parts: EvaluatedPartPose[]\` vào \`EvaluatedPose\`.
  + Thêm \`resolvePartBone(char, rig, partKey)\` trong \`packages/anim-core/src/setup.ts\` tự động map part anatomical bone (\`upper_arm_R -> upper_arm_R\`, \`forearm_R -> forearm_R\`, v.v.) trong khi slot drawOrder vẫn giữ nguyên tầng z-layer.
  + Cập nhật \`evaluator.ts\` và \`compiler.ts\` để đánh giá và compile từng part theo đúng anatomical boneIndex riêng biệt, với secondary sort deterministic theo partKey.
  + Cập nhật \`packages/runtime-pixi/src/instance.ts\` để \`PixiCharacterInstance\` quản lý sprite cho từng partKey độc lập, giữ nguyên 100% numerical parity (dung sai < 1e-4).

============================================================
3. P0-3: SPRITE PIVOT & DISTAL ANCHOR EDITING UI
============================================================
- Vấn đề trước đây: Editor thiếu command, UI inspector, và canvas handle để điều chỉnh pivot và distal anchor của sprite part.
- Giải pháp đã triển khai:
  + Thêm \`SetPartPivotCommand\` và \`SetPartDistalAnchorCommand\` trong \`apps/editor/src/model/commands.ts\` với clamping [0..1] và hỗ trợ undo/redo đầy đủ.
  + Thêm tab "Parts" trong \`HierarchyPanel.tsx\` liệt kê đầy đủ 16 parts, tên texture, slot, và badge \`MOD\` khi có override.
  + Cập nhật \`InspectorPanel.tsx\` với section riêng khi chọn Part: hiển thị kích thước px, layer slot, 2 thanh sliders điều chỉnh Pivot U/V và 2 thanh sliders điều chỉnh Distal Anchor U/V.
  + Trong \`Viewport.tsx\`, render trực quan sprite bounding box (viền xanh ngọc), sprite pivot (tròn xanh ngọc viền trắng), và sprite distal anchor (hình thoi cyan viền trắng kèm đường nối).
  + Cho phép kéo thả trực tiếp pivot handle và distal anchor handle trên canvas với transaction coalescing mượt mà.

============================================================
4. P0-4: TELEMETRY TRACKER EVENT STREAM & LIFECYCLE
============================================================
- Vấn đề trước đây: \`metrics.ts\` tăng biến đếm adjustment mỗi lần React rerender / \`doc.subscribe\`; không tách bạch engineering compliance và human visual review.
- Giải pháp đã triển khai:
  + Viết lại \`SessionMetricsTracker\` trong \`apps/editor/src/model/metrics.ts\` với lifecycle chuẩn: \`IDLE -> ACTIVE -> ENDED\`. Khi kết thúc session, object \`SessionRecord\` được freeze bất biến.
  + Tách bạch \`engineeringCompliance: boolean\` (issues === 0) và \`visualReviewStatus: "NOT_REVIEWED" | "PASS" | "FAIL"\`.
  + Gỡ bỏ hoàn toàn \`tracker.recordAdjustment()\` khỏi \`doc.subscribe\`.
  + Thêm listener \`history.onCommandCommitted\`, \`history.onUndo\`, \`history.onRedo\` trong \`HistoryManager\` để chỉ ghi nhận adjustment khi có user action thực sự.
  + Thêm confirm dialog chặn switch character khi session đang \`ACTIVE\` và có dirty changes.
  + Gắn \`tracker.markExported()\` vào nút Export Character trong Toolbar.

============================================================
5. P1-1 & P1-2: PNG RGBA STREAM DECODING & CUTOUT VALIDATION
============================================================
- Vấn đề trước đây: \`check-asset-integrity.mjs\` chỉ kiểm tra header PNG và file size > 5KB, không decode pixel data để chứng minh có nền trong suốt hay không phải hình chữ nhật đặc giả mạo.
- Giải pháp đã triển khai:
  + Tích hợp pure Node.js (\`node:zlib\`) PNG RGBA stream decompressor trong \`scripts/check-asset-integrity.mjs\` và export \`decodePngRgba(buf)\`.
  + Giải mã scanlines với đầy đủ các bộ lọc Paeth / Sub / Up / Average.
  + Đo đạc chính xác: \`transparentFraction\`, \`opaqueFraction\`, và kiểm tra 4 góc \`cornersTransparent\`.
  + Toàn bộ 48/48 textures thật đều có \`transparentFraction\` từ 19.9% đến 64.7% (nền trong suốt chuẩn), và \`opaqueFraction\` từ 35.3% đến 80.0% (nội dung minh họa đặc).
  + Kiểm tra kích thước pixel thực tế khớp 100% với \`character.json\`.
  + Bổ sung unit test trong \`tests/phase-c1-asset-integrity.test.ts\` chứng minh rằng ảnh chữ nhật đặc (0% transparent) và ảnh rỗng (<10% opaque) đều bị reject bởi validator.
  + Làm rõ kiểm tra SHA-256 contralateral là bài test loại trừ exact duplicate bit-for-bit.

============================================================
6. P1-3: GENERATION LEDGER PROVENANCE HARDENING
============================================================
- Vấn đề trước đây: \`generation-ledger.json\` thiếu provider, model, promptTextHash, và rawOutputsAndHashes.
- Giải pháp đã triển khai:
  + Cập nhật \`docs/phase-c1/generation-ledger.json\` theo schema định kiểu chặt chẽ:
    * \`provider\`: "Google/DeepMind"
    * \`model\`: "imagen-3.0-generate-002"
    * \`promptVersion\`: "v1.0"
    * \`promptTextHash\`: SHA-256 hash chuẩn của prompt string
    * \`rawOutputsAndHashes\`: mảng chứa path, bytes, sha256 đã verify với file thực tế trên đĩa
    * \`status\`: "ACCEPTED" | "REJECTED"
    * \`failureCode\`: mã lỗi theo taxonomy (ART_ROBE_UNRIGGABLE, ART_OCCLUDED_LIMBS, ART_MERGED_LIMBS, ART_INCOMPLETE_PARTS) hoặc null
    * \`notes\`: ghi chú thẩm định
  + Tạo test suite \`tests/generation-ledger-schema.test.ts\` tự động kiểm tra tính hợp lệ và toàn vẹn toán học của ledger.

============================================================
7. P1-4: KẾT LUẬN & NGÔN NGỮ BÁO CÁO TRUNG THỰC
============================================================
- Vấn đề trước đây: Ngôn ngữ một số chỗ còn dễ gây hiểu nhầm là đã pass human visual trial.
- Giải pháp đã triển khai:
  + Cập nhật \`README.md\`, \`docs/phase-c1/results.md\`, \`docs/phase-c1/stage1-results.md\` với trạng thái thống nhất:
    "STAGE 1 REAL ASSET PACKAGE — ENGINEERING HARDENING COMPLETE / HUMAN VISUAL GATE PENDING"
  + Đánh dấu visual seam & bleed inspection là: "HUMAN_VISUAL_GATE_REQUIRED" (đòi hỏi human operator thẩm định bằng mắt).
  + Giữ nguyên kết luận: "INCONCLUSIVE — HUMAN EVIDENCE MISSING" đối với human operator timing/clicks (tuân thủ nghiêm ngặt Invariant #1 NO UNOBSERVED SUCCESS và Invariant #3 NO FAKE IMPLEMENTATION).
  + Cập nhật schema mẫu trong \`docs/phase-c1/human-session-protocol.md\` khớp với \`SessionRecord\`.

============================================================
8. KẾT QUẢ KIỂM THỬ TOÀN DIỆN
============================================================
- \`pnpm test\`: 17 test files, 82 tests passing (100% PASS).
- \`pnpm typecheck\` (\`tsc -b\`): 0 errors (PASS).
- \`pnpm build\`: Tất cả 5 packages + app preview + app editor build thành công 100% (PASS).
- \`node scripts/check-asset-integrity.mjs\`: 3/3 characters, 48/48 textures PASS.

Kính mời Supervisor kiểm tra và đưa ra review độc lập / kết luận nghiệm thu cho Phase C.1 Stage 1 Gate Hardening. Nếu còn điểm nào cần hoàn thiện thêm, xin vui lòng cung cấp chỉ dẫn cụ thể để tôi tiếp tục thực hiện!`;

console.log('Sending re-review prompt to ChatGPT via opencli...');
const sendRes = spawnSync('opencli.cmd', ['chatgpt', 'send', promptText], {
  encoding: 'utf8',
  stdio: 'pipe'
});

console.log('Send output:', sendRes.stdout || sendRes.stderr);

console.log('Polling ChatGPT response...');
let lastText = '';
for (let i = 0; i < 36; i++) {
  // wait 5s
  execFileSync('node', ['-e', 'setTimeout(()=>{}, 5000)']);

  const readRes = spawnSync('opencli.cmd', ['chatgpt', 'read', '-f', 'json'], {
    encoding: 'utf8',
    stdio: 'pipe'
  });

  if (readRes.status === 0 && readRes.stdout) {
    try {
      const data = JSON.parse(readRes.stdout);
      const msgs = Array.isArray(data) ? data : data.messages || [];
      const assistant = msgs.filter(m => (m.role || '').toLowerCase() === 'assistant');
      if (assistant.length > 0) {
        const text = assistant[assistant.length - 1].text || '';
        if (text.length > 100 && text === lastText) {
          console.log('\n=== CHATGPT SUPERVISOR RESPONSE RECEIVED ===\n');
          console.log(text);
          fs.writeFileSync('docs/phase-c1/gpt-review.md', text, 'utf8');
          console.log('\nSaved to docs/phase-c1/gpt-review.md');
          process.exit(0);
        }
        lastText = text;
        console.log(`[${(i + 1) * 5}s] Generating... (${text.length} chars)`);
      } else {
        console.log(`[${(i + 1) * 5}s] Waiting for assistant message...`);
      }
    } catch (e) {
      console.log(`[${(i + 1) * 5}s] Parse waiting:`, e.message);
    }
  } else {
    console.log(`[${(i + 1) * 5}s] Read attempt returned:`, readRes.stderr?.trim() || readRes.stdout?.trim());
  }
}

if (lastText) {
  console.log('\nSaving captured response...');
  fs.writeFileSync('docs/phase-c1/gpt-review.md', lastText, 'utf8');
}
