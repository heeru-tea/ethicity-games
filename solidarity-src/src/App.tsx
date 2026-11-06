import { useEffect, useState } from "react";
import { Landing } from "./features/room/Landing";
import { TeacherScreen } from "./features/room/TeacherScreen";
import { StudentScreen } from "./features/room/StudentScreen";
import { normalizeCode } from "./shared/protocol";
import { playSfx, setSoundEnabled, soundEnabled } from "./game/exam/sound";
import { getAvatar, loadAssets, setAvatar, type AvatarId } from "./common/pack";
import { AvatarPick } from "./features/room/AvatarPick";
import { Icon } from "./common/Sprite";
import { pageUrl } from "./net/server";
import { tokenKeyFor } from "./net/useRoom";
import { postReady } from "./integration";
import { StageLayout } from "./components/game/layout";

// 앱 라우팅 — QR 로 들어오면 ?room=CODE 가 붙어 있어 별명만 적으면 된다. 선생님은 ?teach=CODE.
// 저장 키는 ethicity.solidarity.* 만 쓴다.

type Route =
  | { kind: "landing"; presetCode: string | null }
  | { kind: "teacher"; code: string }
  | { kind: "student"; code: string; name: string };

const NAME_KEY = "ethicity.solidarity.name";

function readName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveName(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // 저장 실패는 무시
  }
}

export function App() {
  const [route, setRoute] = useState<Route>(() => {
    const params = new URLSearchParams(window.location.search);
    const code = normalizeCode(params.get("room") ?? "");
    const teach = normalizeCode(params.get("teach") ?? "");
    if (teach.length === 6) return { kind: "teacher", code: teach };
    if (code.length === 6) {
      // 이미 이 교실에 들어와 있던 학생이면(새로고침·화면 잠금) 바로 자리로 돌려보낸다.
      let token: string | null = null;
      try {
        token = window.localStorage.getItem(tokenKeyFor(code));
      } catch {
        token = null;
      }
      const saved = readName();
      if (token && saved) return { kind: "student", code, name: saved };
      return { kind: "landing", presetCode: code };
    }
    return { kind: "landing", presetCode: null };
  });

  useEffect(() => {
    // 공통 팩 이미지를 미리 불러오고, 끝나면 허브에 준비 완료를 알린다.
    void loadAssets().finally(() => postReady());
  }, []);

  return (
    <div className="sd-app">
      <SoundToggle />
      {route.kind === "landing" ? (
        <LandingRoute
          presetCode={route.presetCode}
          onTeacher={(code) => {
            window.history.replaceState(null, "", pageUrl({ teach: code }));
            setRoute({ kind: "teacher", code });
          }}
          onStudent={(code, name) => {
            saveName(name);
            window.history.replaceState(null, "", pageUrl({ room: code }));
            setRoute({ kind: "student", code, name });
          }}
        />
      ) : null}
      {route.kind === "teacher" ? <TeacherScreen code={route.code} /> : null}
      {route.kind === "student" ? <StudentScreen code={route.code} name={route.name} /> : null}
    </div>
  );
}

/** QR 로 들어온 학생은 코드가 이미 있으니 별명만 받는다. */
function LandingRoute({
  presetCode,
  onTeacher,
  onStudent,
}: {
  presetCode: string | null;
  onTeacher: (code: string) => void;
  onStudent: (code: string, name: string) => void;
}) {
  const [name, setName] = useState(readName);
  const [avatar, setAvatarState] = useState<AvatarId>(getAvatar);
  const pickAvatar = (id: AvatarId) => {
    setAvatar(id);
    setAvatarState(id);
  };

  if (!presetCode) {
    return <Landing onTeacher={onTeacher} onStudent={onStudent} />;
  }

  return (
    <div className="sd-wrap">
      <StageLayout title={<PageHead presetCode={presetCode} />}>
        <div className="ee-panel sd-joinform">
          <div>
            <label htmlFor="nick" className="sd-label">
              내 별명
            </label>
            <input
              id="nick"
              className="sd-input"
              placeholder="예: 새봄"
              maxLength={8}
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) onStudent(presetCode, name.trim());
              }}
            />
            <p className="sd-small sd-muted">실명 대신 오늘 쓸 별명을 적어요. 별명 외의 정보는 받지 않아요.</p>
          </div>
          <AvatarPick value={avatar} onChange={pickAvatar} />
        </div>

        <button
          type="button"
          className="ee-button sd-wide sd-big"
          disabled={name.trim().length === 0}
          onClick={() => {
            playSfx("door");
            onStudent(presetCode, name.trim());
          }}
        >
          교실 들어가기
        </button>

        <p className="sd-small sd-muted">윤리시티, 루미AI, 요금제와 가격은 모두 수업용 가상 설정입니다.</p>
      </StageLayout>
    </div>
  );
}

function PageHead({ presetCode }: { presetCode: string }) {
  return (
    <header className="sd-pagehead">
      <p className="sd-kicker">윤리시티 · 연대성</p>
      <h1 className="sd-title">교실에 들어갑니다</h1>
      <p className="sd-sub">
        교실 코드 <span className="sd-strong sd-num" style={{ letterSpacing: "0.12em" }}>{presetCode}</span>
      </p>
    </header>
  );
}

function SoundToggle() {
  const [on, setOn] = useState(() => soundEnabled());
  useEffect(() => {
    setSoundEnabled(on);
  }, [on]);
  return (
    <button
      type="button"
      className="ee-button secondary sd-sound"
      aria-pressed={on}
      aria-label={on ? "효과음 켜짐, 누르면 끔" : "효과음 꺼짐, 누르면 켬"}
      onClick={() => setOn((v) => !v)}
    >
      <Icon id={on ? "volume" : "music"} size={24} />
      <span>{on ? "소리 켬" : "소리 끔"}</span>
    </button>
  );
}
