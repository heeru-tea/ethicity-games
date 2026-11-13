import { AVATAR_IDS, characterName, type AvatarId } from "../../common/pack";
import { Standing } from "../../common/Sprite";

// 내 아바타 고르기 — 공통 팩 학생 캐릭터 중 둘(지호·하늘). 서버로 보내지 않고 이 기기에만 저장한다.

export function AvatarPick({ value, onChange }: { value: AvatarId; onChange: (id: AvatarId) => void }) {
  return (
    <div>
      <span className="sd-label">내 아바타</span>
      <div className="sd-choices--inline" role="group" aria-label="내 아바타">
        {AVATAR_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="ee-choice"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "6px 14px" }}
            aria-pressed={value === id}
            onClick={() => onChange(id)}
          >
            <Standing id={id} direction="down" scale={0.45} label="" />
            {characterName(id)}
          </button>
        ))}
      </div>
    </div>
  );
}
