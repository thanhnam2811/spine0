Tôi đã đối chiếu trực tiếp state của repository tại bc1e2eb7e2f6fbe716368a462718c7e5ee08ad94, gồm schema, anim-core, validator, compiler, runtime-pixi, editor model/UI, Phase C.1 fixtures, ledger, integrity checker và human-gate protocol.

Kết luận

CHANGES REQUIRED.

Việc hạ kết luận Phase C từ “production pass” xuống ENGINEERING / SYNTHETIC PRODUCTION HARNESS PASS là đúng hướng, và việc dừng Phase C.1 trước human gate cũng đúng.

Nhưng Stage 1 hiện chưa thực sự “ASSETS READY FOR HUMAN GATE”. Có ít nhất hai blocker cấp kiến trúc khiến human trial theo tài liệu không thể tạo ra bằng chứng rigging hợp lệ ở commit này.

Blocker 1 — Editor không render character artwork

apps/editor/src/components/Viewport.tsx chỉ tạo Pixi Graphics cho:

skeleton,

ground,

clearance proxy,

handles,

envelope overlay.

Nó không import/use Sprite, Texture, Assets, PixiCharacterInstance, cũng không load character.parts[*].texture.

Nói cách khác, preset real-normal-01, real-heavy-01, real-small-01 có được đăng ký vào dropdown, nhưng Viewport không hiển thị 48 texture thực tế.

Do đó các bước human gate như:

kiểm tra alpha seam,

shoulder/elbow/hip/knee bleed,

weapon clearance,

garment tearing,

foot sliding trên artwork,

dynamic visual draw order,

không thể được thực hiện đúng nghĩa.

Đây không phải usability issue nhỏ. Nó làm mất mục đích chính của Phase C.1.

Viewport.tsx

Blocker 2 — Data model hiện làm rơi phần lớn limb sprites

Đây là lỗi nghiêm trọng hơn.

Rig định nghĩa slot kiểu:

slot_arm_near -> upper_arm_R
slot_arm_far  -> upper_arm_L
slot_leg_near -> thigh_R
slot_leg_far  -> thigh_L

Nhưng character lại gán:

upper_arm_R -> slot_arm_near
forearm_R   -> slot_arm_near
hand_R      -> slot_arm_near

và tương tự cho toàn bộ arm/leg.

Trong anim-core/evaluator.ts:

TypeScript
const slotToPartMap = new Map();

for (const [partKey, partDef] of Object.entries(character.parts)) {
  slotToPartMap.set(partDef.slot, ...)
}

Một slot chỉ giữ một part cuối cùng.

Với ordering hiện tại, slot_arm_near cuối cùng giữ hand_R; upper_arm_R và forearm_R bị overwrite. Legs tương tự.

Sau đó runtime-pixi cũng chỉ tạo:

TypeScript
one Container + one Sprite per slot

chứ không phải per part.

Kết quả kiến trúc hiện tại về cơ bản là:

16 character parts
        ↓
8-ish occupied slots
        ↓
1 sprite / slot
        ↓
upper arms, forearms, thighs, shins có thể biến mất

Compiler có compile đủ 16 CompiledPart, nhưng evaluator/runtime representation không giữ được cardinality đó.

evaluator.ts
 · instance.ts
 · humanoid-normal-v1.rig.json

Đây là modeling error, không nên vá bằng cách đặc biệt hóa Phase C.1.

Geometry / rigging contract cũng đang lệch

Schema nói:

TypeScript
PartDefinition {
  pivot
  distalAnchor
}

nghĩa là pivot/anchor thuộc sprite part.

Nhưng editor hiện không có command chỉnh hai field đó.

SetDistalAnchorCommand không chỉnh:

TypeScript
character.parts[x].distalAnchor

mà thay đổi:

TypeScript
boneOverrides[boneId].rotation
boneOverrides[boneId].length

Viewport gọi vòng tròn tại bone origin là "Pivot handle", nhưng đó thực tế là bone joint, không phải normalized sprite pivot.

Vì vậy tài liệu human protocol:

adjust pivot_x / pivot_y
adjust anchor_x / anchor_y

không tương ứng với editor implementation.

Điều này đặc biệt nguy hiểm với real art vì vấn đề chính cần calibrate là:

texture pixels
     ↕
sprite pivot
     ↕
bone joint
     ↕
next anatomical joint

Hiện editor chủ yếu đang sửa skeleton để chạy theo sprite metadata cố định, thay vì cho operator chỉnh registration của sprite với skeleton.

commands.ts

Asset integrity PASS đang overclaim

scripts/check-asset-integrity.mjs hữu ích để loại placeholder sơ đẳng, nhưng chưa đủ chứng minh các statement trong report.

Nó hiện xác nhận:

PNG signature;

width/height;

file > 5 KiB;

PNG colorType có alpha;

L/R SHA-256 khác nhau.

Nhưng không decode pixel data.

Vì vậy:

hasAlpha = true

chỉ có nghĩa:

file format có alpha channel

không có nghĩa:

texture thực sự có transparent cutout.

Một PNG RGBA toàn bộ alpha=255 vẫn PASS.

Nó cũng không kiểm tra:

tồn tại alpha=0;

tỷ lệ transparent pixels;

border/corner transparency;

anti-aliased alpha edge;

white halo;

RGB contamination dưới alpha=0;

connected components;

actual silhouette;

12–18 px joint bleed;

joint cap topology.

Do đó statement trong stage1-results.md:

“Background: 100% transparent (alpha = 0) via morphological exterior flood-propagation with edge defringing”

không được integrity checker chứng minh.

check-asset-integrity.mjs
 · asset-integrity.json

Cũng tương tự:

L hash != R hash

chứng minh hai file không byte-identical.

Nó không chứng minh:

“independently illustrated perspectives”.

Một file mirror rồi chỉnh 1 pixel cũng vượt qua test.

Nên gọi test đó là exact-duplicate rejection, không phải proof of independent illustration.

Generation provenance không đạt chính methodology đã freeze

methodology.md yêu cầu mỗi attempt có:

provider

model

promptVersion

promptTextHash

rawOutputs

SHA-256 raw output

status/failure codes

human notes.

Nhưng generation-ledger.json thực tế chủ yếu có:

prompt plaintext;

outputArtifact path;

status;

timestamp;

failureCode.

Không có provider, model, promptTextHash, raw artifact hash trong các accepted records tôi kiểm tra.

Ví dụ REAL-N01-A02 chỉ có prompt, status, partsExtracted và timestamp.

Vì vậy claim:

“full prompt provenance”

hiện không đúng theo definition do chính Phase C.1 đặt ra.

generation-ledger.json
 · methodology.md

Human telemetry hiện chưa đủ tin cậy để mở gate

Protocol và implementation khác nhau khá nhiều.

Tài liệu yêu cầu:

Start Session
...
End Session & Export Telemetry

UI thực tế chỉ có:

Session Stats
Export Session Record (.json)

Tracker được tạo tự động ngay khi preset được instantiate.

Không có explicit session lifecycle.

Quan trọng hơn, EditorApp đăng ký:

TypeScript
doc.subscribe(() => {
  tracker.recordAdjustment();
  tracker.updateIssueCount(...)
})

Nghĩa là mọi doc.notify() đều bị tính thành adjustment, kể cả các mutation không nhất thiết là một thao tác calibration độc lập.

Trong khi đó tracker có các API đúng kiểu:

TypeScript
recordAdjustment("pivot")
recordAdjustment("anchor")
recordAdjustment("length")
...

nhưng tracker không được truyền vào Viewport hoặc InspectorPanel.

Do đó các counter chuyên biệt như:

pivotEditCount
anchorEditCount
positionOverrideCount
rotationOverrideCount
lengthOverrideCount
slotRemapCount
drawOrderEditCount

không có đường wiring rõ ràng để phản ánh thực tế.

Thực tế chúng có khả năng giữ 0, còn totalAdjustments tăng theo notify().

Ngoài ra:

Toolbar Export Character không gọi tracker.markExported().

Session modal export telemetry cũng không gọi nó.

không thấy session_ended.

schema docs dùng initialIssueCount, implementation dùng initialIssues.

docs dùng undoCount; implementation dùng totalUndos.

docs minh họa finalValidity: "PASS"; implementation là boolean.

verdict mới là "PASS" | "FAIL".

Vậy ngay cả nếu người thật thao tác hôm nay, telemetry thu được vẫn không đáp ứng protocol đã viết.

EditorApp.tsx
 · metrics.ts
 · human-session-protocol.md

Một vấn đề thử nghiệm khác: initial compliance = 0 giây

Ba real character hiện đều có:

JSON
"boneOverrides": {}

và pivots được điền trước bằng các giá trị generic gần như giống nhau:

arms  0.5,0.15 → 0.5,0.85
legs  0.5,0.15 → 0.5,0.85
feet  0.3,0.35 → 0.85,0.85

Validator chủ yếu kiểm envelope từ canonical skeleton, không kiểm texture-to-joint geometric registration.

Nếu initial validator trả zero issues, SessionMetricsTracker lập tức:

TypeScript
timeToCompliance = 0

ngay khi session được tạo.

Như vậy metric "time to compliance" có thể báo 0 giây trước khi operator nhìn artwork, dù character có seam, pivot lệch hoặc weapon grip sai.

Nó đo schema/envelope compliance, không đo production visual compliance.

Hai khái niệm này phải tách ra.

Test suite chưa bắt đúng failure mode quan trọng nhất

Test Phase C.1 hiện chứng minh được ba thứ hữu ích:

files tồn tại + lightweight file checks;

attempt records tồn tại;

compile và sample không throw.

Nhưng test thứ 3:

TypeScript
samplePose.bones["head"] exists
finite worldX/worldY

không kiểm:

đủ 16 rendered parts;

mỗi part đi theo bone thích hợp;

upper arm / forearm / hand đều tồn tại đồng thời;

texture được load;

texture pivot đúng;

slot cardinality;

runtime render parity ở part level.

Do đó architecture bug many parts → one slot → one sprite hoàn toàn lọt qua 75 tests.

Số test PASS vì thế không phải bằng chứng cho real-character rendering correctness.

Những phần tôi công nhận

Có nhiều cải thiện đáng giữ nguyên:

Phase C historical reclassification là cần thiết.

Anti-simulation invariant hợp lý.

Stage 1 → Stage 2 gate đúng tinh thần R&D.

Failure attempts được giữ lại thay vì xóa.

48 PNG có kích thước/file size thực tế hơn synthetic fixtures rất nhiều.

contralateral exact SHA collision đã được loại bỏ.

canonical rigs/envelopes không bị lén sửa để ép trial pass.

boneOverrides: {} ban đầu giúp không che giấu rig-family problem bằng pre-fitting.

việc chưa tự bịa human timing là đúng.

Vì thế tôi không yêu cầu quay lại Phase A/B hay viết lại engine.

Phải sửa đúng choke point hiện tại: part representation → visual editor → honest integrity → human telemetry.

Supervisor verdict

CHANGES REQUIRED — DO NOT RUN THE HUMAN GATE YET.

Human trial tại bc1e2eb sẽ tạo ra dữ liệu có vẻ “người thật”, nhưng dữ liệu đó không trả lời câu hỏi Phase C.1 vì người operator chưa thực sự nhìn và calibrate toàn bộ rendered character art.

Sau khi bốn blocker trên được sửa và regression-test, lúc đó mới mở human gate. Không mở Stage 2.

NEXT PROMPT
Sửa

You are the implementation agent for thanhnam2811/spine0 (animation-factory).

Baseline reviewed by the Lead Rigging Systems Architect:

repository: https://github.com/thanhnam2811/spine0

branch: main

reviewed commit: bc1e2eb7e2f6fbe716368a462718c7e5ee08ad94

Phase C.1 Stage 1 supervisor verdict: CHANGES REQUIRED

Stage 2 is FORBIDDEN.

Do NOT fabricate human telemetry.

Do NOT run or claim completion of the human gate.

Do NOT rewrite the architecture unnecessarily.

Preserve the three frozen rig families and existing animation templates unless a demonstrated correctness bug absolutely requires a schema-compatible change.

Your task is to perform Phase C.1 Stage 1 Gate Hardening so that a real human operator can actually inspect and calibrate the 3 real illustrated characters and export trustworthy telemetry.

Supervisor findings that MUST be addressed
P0-1 — Character art is not rendered in the editor

apps/editor/src/components/Viewport.tsx currently renders Pixi Graphics overlays/skeleton/handles but does not load/render character.parts[*].texture.

The human protocol therefore cannot inspect seams, joint bleed, weapon clearance, clothing tearing, foot sliding, or real draw order.

Implement real texture rendering in the editor for:

real-normal-01

real-heavy-01

real-small-01

and preserve compatibility with existing fixtures.

Textures must visibly follow the evaluated skeleton in both Setup and Preview modes.

Skeleton/debug overlays must remain optionally visible above the artwork.

P0-2 — Current slot model collapses multiple anatomical parts

Current characters bind multiple parts to the same layer slot, e.g.:

upper_arm_R

forearm_R

hand_R

all bind to slot_arm_near.

anim-core/evaluator.ts currently reduces character.parts to Map<slotId, part>, causing later parts to overwrite earlier parts.

runtime-pixi also creates only one sprite per slot.

Fix this correctly.

Required invariant:

All 16 character parts must exist simultaneously at runtime, while draw-order/layer slots remain usable for grouping/layer ordering.

Do NOT solve this with character-specific hacks.

Choose and document a clean model such as:

part instance has its own bound anatomical bone plus a layer/draw-order slot, or

another minimal equivalent design.

A part's transform must come from its actual anatomical bone:

upper_arm_R → upper_arm_R

forearm_R → forearm_R

hand_R → hand_R

thigh_R → thigh_R

shin_R → shin_R

foot_R → foot_R

corresponding L parts likewise

weapon → hand_R / weapon attachment rule

torso/pelvis/head → matching bones

Slots may control layer order but MUST NOT accidentally define the wrong transform bone for an entire multi-part limb.

Add regression tests proving all 16 parts survive evaluation/compiler/runtime representation and are bound to the expected bones.

P0-3 — Sprite pivot/anchor calibration contract is false in the current editor

PartDefinition.pivot and PartDefinition.distalAnchor are part-level normalized coordinates.

However current viewport “pivot” handles manipulate bone setup position and SetDistalAnchorCommand manipulates bone rotation/length.

That is not equivalent.

Implement explicit commands and editor controls for part registration:

set part pivot

set part distal anchor where applicable

undo/redo support

transaction coalescing for dragging

normalized [0,1] clamping

validator integration

Keep bone joint editing as a separate concept.

The UI must make the distinction visually clear:

Bone Joint / Bone Setup Position

Bone Distal Tip / Bone Length

Sprite Pivot

Sprite Distal Anchor

Do not silently rename one concept into another.

P0-4 — Human session telemetry is not trustworthy

Fix the human session lifecycle and schema.

Current problems include:

tracker auto-starts on document creation;

protocol refers to Start/End Session controls that do not exist;

every doc.notify() is counted as an adjustment;

typed edit counters are not wired to actual commands;

toolbar undo/redo paths do not consistently record telemetry;

character export does not mark exported;

telemetry export does not create an explicit end event;

documentation field names/types differ from implementation.

Implement an explicit lifecycle:

IDLE -> ACTIVE -> ENDED

Requirements:

Operator explicitly starts a session.

Starting captures:

operatorId

characterId

initial validator state

timestamp

immutable baseline character hash or serialized baseline digest.

Only actual committed user mutations count as adjustments.

Coalesced drag = one logical adjustment.

Categorize actual committed operations:

spritePivot

spriteAnchor

bonePosition

boneRotation

boneLength

slotRemap

drawOrder

familyChange if permitted

undo

redo

Preview-only actions must not count as rig adjustments.

Export Character must set the character-export evidence flag.

Ending the session must append session_ended and freeze the summary.

Telemetry export must export that frozen ended summary; it must not continue changing afterward.

If the selected character changes during an ACTIVE session, block it or require ending/aborting the current session first.

Define one canonical TypeScript SessionRecord schema and make human-session-protocol.md match it exactly.

Add tests for lifecycle, counts, undo/redo, drag coalescing, export flag and frozen end time.

Do not fabricate any human session files.

P1-1 — Asset integrity check overclaims transparency

scripts/check-asset-integrity.mjs currently checks PNG IHDR color type only.

hasAlpha === true does NOT prove a transparent silhouette.

Upgrade the checker to inspect actual decoded pixel alpha.

At minimum verify:

PNG decodes successfully;

expected bit depth/color representation;

at least one genuinely transparent pixel;

at least one genuinely opaque/non-transparent content pixel;

reasonable transparent-background fraction;

transparent pixels exist on exterior/corners;

reject an RGBA image whose alpha is 255 everywhere;

dimensions in character.json agree with decoded texture dimensions;

detect obvious solid rectangular placeholders using simple content/alpha statistics.

Do not claim that this automatically proves artistic quality.

Rename/report properties precisely, e.g.:

hasAlphaChannel

transparentPixelCount

opaquePixelCount

transparentFraction

rather than treating hasAlpha as proof of cutout quality.

Keep SHA-256 exact duplicate detection, but document it accurately as:

exact contralateral duplicate rejection

not proof that limbs were independently illustrated.

Do not invent a perceptual-independence test unless one is actually implemented.

P1-2 — Joint bleed 12–18 px is not currently validated

The generation procedure specifies 12–18 px overlap bleed but current automated integrity test does not prove it.

Choose one of these honest approaches:

A. implement a measurable part-specific joint-cap/overlap validation with clearly documented assumptions;

OR

B. classify bleed/seam quality explicitly as HUMAN_VISUAL_GATE_REQUIRED and remove automated PASS wording that implies it has already been verified.

Prefer B unless a robust measurable rule is available without overengineering.

P1-3 — Generation provenance does not satisfy its frozen methodology

docs/phase-c1/methodology.md requires fields including:

provider

model

promptVersion

promptTextHash

rawOutputs and hashes

status

failure codes

notes

but generation-ledger.json / attempt records do not contain all of them.

Do NOT invent missing historical facts.

For information that is genuinely known from existing evidence, populate it.

For information that cannot be recovered honestly, record explicit machine-readable values such as:

"provider": "UNKNOWN_NOT_RECORDED"

"model": "UNKNOWN_NOT_RECORDED"

and classify provenance completeness accordingly.

Compute hashes for existing prompt text and archived artifacts where possible.

Add a validation test/schema for generation-ledger entries so future attempts cannot silently omit mandatory provenance fields.

The report must state that Stage 1 historical provenance is partially incomplete if provider/model cannot be established.

P1-4 — Separate engineering compliance from visual compliance

Do not use validator-zero-issues as equivalent to production visual readiness.

Introduce clear concepts:

engineeringCompliance: schema/rig/envelope checks

visualReviewStatus: NOT_REVIEWED / PASS / FAIL

optionally per-clip visual findings.

timeToComplianceSeconds must not become 0 simply because the imported character already satisfies numerical envelope checks.

If timing is retained, distinguish:

timeToEngineeringCompliance

timeToHumanVisualAcceptance

The latter can only be finalized by the real human gate.

Regression tests required before asking for human trial

Add tests demonstrating at minimum:

evaluator exposes all 16 parts simultaneously;

each canonical limb part follows its correct anatomical bone;

multiple parts may share a layer slot without overwriting one another;

runtime/editor can construct/render all 16 part sprites;

sprite pivot edits modify PartDefinition.pivot, not bone transforms;

sprite distal-anchor edits modify PartDefinition.distalAnchor;

part edits undo/redo correctly;

asset checker rejects an RGBA-but-fully-opaque fake PNG;

asset checker accepts a valid cutout PNG;

texture dimensions match character metadata;

telemetry lifecycle is explicit and deterministic;

one drag produces one logical adjustment;

typed telemetry counters reflect real committed operations;

session record cannot change after END;

generation ledger validator detects missing provenance fields;

the three Phase C.1 characters compile/evaluate with all expected parts.

Keep previous test suites green.

Run and report:

pnpm lint
pnpm typecheck
pnpm test
pnpm build

Also report the exact test-file/test-count result rather than copying the old 16 / 75 number.

Documentation corrections required

Update the relevant Phase C.1 docs so claims match evidence.

Until a real human trial is completed, use status wording no stronger than:

STAGE 1 REAL ASSET PACKAGE — ENGINEERING HARDENING COMPLETE / HUMAN VISUAL GATE PENDING

Only use that wording after the hardening work itself passes.

Do NOT state:

human visual PASS;

seam PASS;

production viability PASS;

independently illustrated proven by hashes;

complete provenance if provider/model remain unknown.

Preserve:

INCONCLUSIVE — HUMAN EVIDENCE MISSING

until actual human evidence exists.

Scope control

Do NOT:

execute Stage 2;

generate six more characters;

alter rig-family envelopes merely to force PASS;

fabricate human session JSON;

fabricate timestamps/provider/model metadata;

rewrite animation templates without evidence;

introduce Spine/DragonBones/etc.;

turn this into a general animation-editor rewrite.

This is a bounded Phase C.1 gate-hardening repair.

Completion report

When implementation is finished, provide:

commit SHA;

files changed;

architecture decision for part-vs-slot representation;

proof that all 16 parts survive evaluation/rendering;

asset-integrity checks now performed and explicitly NOT performed;

provenance completeness status;

telemetry lifecycle/schema;

exact lint/typecheck/test/build results;

remaining limitations;

updated Phase C.1 status.

Then STOP.

Do not run the human session yourself and do not claim Stage 1 PASS.

The next supervisor review will decide whether the repository is finally HUMAN-GATE READY.

Đây là bước nên làm trước khi bạn tự ngồi chỉnh ba nhân vật. Nếu chạy human trial ngay trên bc1e2eb, khả năng cao bạn sẽ thu được telemetry “đẹp” nhưng bằng chứng đó không đo thứ Phase C.1 thực sự cần đo.