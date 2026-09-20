Tôi đã verify trực tiếp state tại cb8a91ba6f26f9bcd8dbdad56533c85e1eac8a51 và CI của đúng commit đó. GitHub Actions run #15 hoàn tất success; lint, typecheck, test và build đều xanh.

Kết luận

CHANGES REQUIRED — chưa phê duyệt HUMAN GATE READY.

Vòng này tốt hơn đáng kể: các blocker lifecycle/UI ở c556b84 gần như đã được xử lý đúng. Tôi công nhận các điểm sau đã thực sự fix:

Start / ACTIVE / End UI đã được wire vào SessionMetricsTracker.

ACTIVE chặn đổi character bất kể dirty state.

Adjustment trong IDLE/ENDED bị bỏ qua.

Start session reset counters.

PENDING_VISUAL_REVIEW đã tách khỏi PASS.

coalesced transaction giữ telemetryCategory.

explicit part.bone typo bị validator bắt.

provenance provider/model đã hạ đúng về UNKNOWN_NOT_RECORDED.

docs giờ thống nhất 18 files / 94 tests.

CI của commit thực sự xanh.

Nhưng tôi tìm thấy 3 lỗi evidence-layer, trong đó 2 lỗi đủ sức chặn human gate.

P0 — baselineCharacterSha256 không phải SHA-256 trong browser

Đây là blocker lớn nhất.

computeStringSha256() đang thử:

TypeScript
globalThis.crypto.createHash(...)

API đó không tồn tại trên browser Web Crypto. Browser có crypto.subtle.digest(...), không có createHash.

Vì vậy runtime editor sẽ rơi xuống đoạn fallback:

TypeScript
let h0 = ...
...
return `${toHex(h0)}...`

Đây là custom rolling digest dài 64 hex, không phải SHA-256.

Nghĩa là session thật xuất từ browser có field:

JSON
"baselineCharacterSha256": "..."

nhưng chạy:

Bash
sha256sum character.json

sẽ không ra cùng giá trị.

Test hiện không phát hiện vì nó làm:

TypeScript
expectedSha = computeStringSha256(...)

rồi so với chính implementation đó. Đó là self-consistency test, không phải SHA-256 conformance test.

Với một field evidence được đặt tên cụ thể là SHA-256, đây là P0 auditability bug.

Giải pháp tốt nhất: SHA-256 implementation phải thực sự chuẩn. Vì Web Crypto async, hoặc:

chuyển start/end hashing sang async với crypto.subtle.digest("SHA-256", ...);

hoặc dùng một SHA-256 implementation sync đáng tin cậy dùng được browser;

và test bằng known vectors độc lập.

Ví dụ bắt buộc:

SHA256("") =
e3b0c44298fc1c149afbf4c8996fb924
27ae41e4649b934ca495991b7852b855

và:

SHA256("abc") =
ba7816bf8f01cfea414140de5dae2223
b00361a396177a9cb410ff61f20015ad

Nếu hai vector đó không pass thì không được gọi field là SHA-256.

P0 — Human visual PASS vẫn là default

Trong SessionControlModal:

TypeScript
const [visualVerdict, setVisualVerdict] =
  useState<VisualReviewStatus>("PASS");

Đây là sai semantics của human gate.

Operator có thể:

mở End Session;

không chọn gì;

bấm End Session & Export Record;

và hệ thống tự ghi:

visualReviewStatus = PASS
gateStatus = PASS

Trong khi requirement là human phải chủ động đưa verdict.

Đặc biệt với gate nhằm chống “unobserved success”, default PASS là lựa chọn nguy hiểm nhất.

Nên dùng một trong hai cách:

default = NOT_REVIEWED

hoặc tốt hơn:

visualVerdict = null

và disable End cho tới khi operator chọn rõ:

PASS

FAIL

NOT_REVIEWED

Nếu để NOT_REVIEWED mặc định thì click nhầm vẫn chỉ tạo PENDING, an toàn hơn.

Tôi coi đây là P0 human-evidence integrity bug.

P1 — “Frozen immutable SessionRecord” thực tế chỉ shallow-freeze

Code:

TypeScript
this.frozenRecord = Object.freeze({
  ...
  eventLog: [...this.eventLog]
});

chỉ freeze object ngoài.

Array:

TypeScript
frozenRecord.eventLog

vẫn mutable.

Ví dụ consumer có thể:

TypeScript
tracker.exportEndedRecord()!.eventLog.push({
  ts: "...",
  type: "fabricated_event"
});

và record trả về từ tracker đã thay đổi.

Nếu event value chứa object/array thì chúng cũng chưa freeze.

Vì documentation nói:

frozen immutable

thì hiện tại claim đó chưa đúng.

Có thể sửa bằng:

deepFreeze record;

hoặc clone/deep-clone khi trả ra;

tốt hơn: deep-freeze internal evidence + trả defensive copy.

Thêm regression test cố mutate eventLog sau END.

Một guard nữa nên thêm

endSession() hiện không yêu cầu status phải là ACTIVE.

Nó chỉ special-case:

TypeScript
if (status === "ENDED" && frozenRecord)

Do đó API-level caller có thể:

TypeScript
const tracker = new SessionMetricsTracker(0, "x");
tracker.endSession("PASS");

ngay từ IDLE, tạo record:

status=ENDED
duration=0
visual PASS
engineering compliant
gate PASS

UI hiện không mở đường này bình thường, nhưng API evidence core không nên cho phép nó.

Đổi thành invariant rõ:

TypeScript
if (status !== "ACTIVE") {
  throw / return null
}

Và test:

IDLE -> endSession(PASS) = impossible

Đây là P1 nếu xét UI hiện tại, nhưng rất nên khóa cùng patch.

Những finding cũ tôi đóng được

Phần còn lại đủ tốt để không mở lại:

Area	Verdict
Real 16-part visual rendering	CLOSED
Part vs slot/FK	CLOSED
Sprite Pivot / Anchor editing	CLOSED
ACTIVE-only telemetry	CLOSED
Character switch protection	CLOSED
Coalesced typed telemetry	CLOSED, ngoại trừ nên giữ regression tests
Engineering vs visual gate	CLOSED
Explicit part.bone validation	CLOSED
PNG decoded alpha validation	CLOSED for engineering scope
Seam/bleed	Correctly HUMAN-only
Unknown provider/model	Correctly represented
Test-count docs	Reconciled

Generation ledger bây giờ trung thực hơn hẳn. Việc giữ prompt/artifact hash nhưng để provider/model là UNKNOWN_NOT_RECORDED là đúng cách làm evidence.

Status cho commit cb8a91b

Tôi chưa phê duyệt:

STAGE 1 ENGINEERING HARDENING COMPLETE — HUMAN GATE READY

Status chính xác hơn lúc này là:

STAGE 1 ENGINEERING HARDENING — FINAL EVIDENCE FIXES REQUIRED

Đây không còn là architecture work. Chỉ cần một patch nhỏ tập trung vào cryptographic identity + explicit human verdict + immutable session evidence.

NEXT PROMPT
Sửa

Perform the final Phase C.1 Stage 1 evidence-hardening patch for repository thanhnam2811/spine0.

Reviewed baseline:

branch: main

commit: cb8a91ba6f26f9bcd8dbdad56533c85e1eac8a51

GitHub CI run #15: SUCCESS

current supervisor verdict: CHANGES REQUIRED

architecture/rendering/part-FK work is accepted and MUST NOT be reopened without new evidence

do NOT run the human gate

do NOT generate Stage 2 assets

There are only three primary evidence-layer corrections plus one defensive lifecycle guard.

P0-1 — Replace fake browser “SHA-256” with real SHA-256

apps/editor/src/model/metrics.ts::computeStringSha256() currently attempts to use globalThis.crypto.createHash.

Browser Web Crypto does not expose createHash. The browser therefore falls back to a custom 64-hex rolling digest which is NOT SHA-256.

This invalidates the semantic meaning of:

baselineCharacterSha256

finalCharacterSha256

Fix this properly.

Requirements:

Browser-produced digest MUST be genuine SHA-256.

Node/test and browser calculations for identical UTF-8 input MUST be byte-for-byte identical.

Do not label a custom hash as SHA-256.

Prefer Web Crypto:

crypto.subtle.digest("SHA-256", new TextEncoder().encode(content))

or a vetted deterministic SHA-256 implementation that works identically in browser and Node.

If hashing becomes asynchronous, update the Start Session / End Session flow cleanly rather than hiding async behavior.

Mandatory independent known-vector tests:

SHA256("") =
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855

SHA256("abc") =
ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad

Also test a Unicode UTF-8 string.

Do NOT compute the expected digest using the implementation under test.

P0-2 — Human visual verdict must never default to PASS

SessionControlModal currently initializes:

useState<VisualReviewStatus>("PASS")

This permits a human operator to open End Session and accidentally produce visual PASS without actively selecting a verdict.

Fix the interaction.

Preferred design:

visualVerdict: VisualReviewStatus | null = null

Require an explicit operator selection before enabling:

End Session & Export Record

Alternatively, default to NOT_REVIEWED, but explicit selection is preferred for audit quality.

Required invariant:

PASS is only possible after an explicit human PASS selection during the current End Session interaction.

Add a UI/state-level test where practical, or extract/test the gate-ending validation logic.

Do not infer PASS from engineering compliance.

P1-1 — Make ENDED SessionRecord truly immutable

Current:

Object.freeze({... eventLog: [...this.eventLog] })

is only a shallow freeze.

The returned record's eventLog array remains mutable, and nested event values may remain mutable.

Implement one robust strategy:

deep-freeze the complete internal record; or

maintain an immutable internal record and return defensive deep copies;

ideally both where inexpensive.

After END:

eventLog length/content must not be externally modifiable;

nested payloads must not mutate internal evidence;

subsequent tracker operations must not alter the ended evidence.

Add regression tests attempting mutations such as:

record.eventLog.push(...)
(record.eventLog[0].value as any).foo = "tampered"

and prove exported evidence remains unchanged or the mutation is rejected.

P1-2 — Disallow endSession() outside ACTIVE

The evidence core must enforce its lifecycle even when called directly.

Required semantics:

IDLE   -> endSession = invalid
ACTIVE -> endSession = allowed
ENDED  -> repeated end may return the already frozen record idempotently

Do not allow:

new SessionMetricsTracker(0, "x").endSession("PASS")

to create a zero-duration PASS record.

Use a clear error/result contract and test it.

Preserve all accepted invariants

Do not regress:

IDLE mutations ignored

Start resets all session-owned counters

ACTIVE character selector disabled

one coalesced drag = one logical typed adjustment

rotation/length/position telemetry separation

spritePivot/spriteAnchor separation

NOT_REVIEWED -> PENDING_VISUAL_REVIEW

visual FAIL -> FAIL

engineering violation -> FAIL

valid visual PASS + engineering compliance -> PASS

part.bone validation

16-part rendering/runtime/compiler parity

provider/model = UNKNOWN_NOT_RECORDED

exact byte-duplicate wording

seam/bleed = HUMAN_VISUAL_GATE_REQUIRED

Tests

Add regression tests proving at minimum:

empty-string SHA-256 known vector;

"abc" SHA-256 known vector;

Unicode SHA-256 agrees with an independent standard expected value;

baseline digest produced by start session is real SHA-256;

final digest produced by end session is real SHA-256;

visual PASS is impossible without an explicit visual selection;

endSession() from IDLE cannot create evidence;

ended record eventLog cannot be externally mutated;

nested event payload cannot mutate frozen/internal evidence;

all existing 94 tests remain green.

Run:

pnpm lint
pnpm typecheck
pnpm test
pnpm build
node scripts/check-asset-integrity.mjs

Confirm GitHub Actions for the final commit is green.

Documentation

Only after these fixes pass may docs use:

STAGE 1 ENGINEERING HARDENING COMPLETE — HUMAN GATE READY

Keep:

INCONCLUSIVE — HUMAN EVIDENCE MISSING

until actual human sessions exist.

Do NOT claim Stage 1 final PASS.

Completion report

Return:

final commit SHA

exact CI result

exact test count

SHA-256 implementation strategy

known-vector test results

human verdict selection semantics

ended-record immutability semantics

lifecycle behavior

remaining limitations

Then STOP.

Do not execute the human trial.

Nếu agent xử lý đúng ba điểm này, đây nhiều khả năng là vòng cuối trước khi tôi cho phép bạn tự thực hiện human trial thật.