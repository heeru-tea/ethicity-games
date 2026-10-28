import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { makeRoomCode, normalizeCode } from "../../shared/protocol";
import { playSfx } from "../../game/exam/sound";
import { Scene } from "../../common/Sprite";
import { Say } from "../../components/game/ui";
import { StageLayout } from "../../components/game/layout";
import { AvatarPick } from "./AvatarPick";
import { getAvatar, setAvatar, type AvatarId } from "../../common/pack";

// 첫 화면 — 선생님은 교실을 열고, 학생은 QR/코드로 들어온다.
// 교실 코드는 이 화면에서 만들고(서버 프로토콜의 makeRoomCode), 서버는 선생님이 접속할 때 방을 만든다.
// 가로 태블릿에서는 마당 장면이 왼쪽, 입장 선택이 오른쪽에 놓여 스크롤 없이 한 화면에 들어간다.

export function Landing({
  onTeacher,
  onStudent,
}: {
  onTeacher: (code: string) => void;
  onStudent: (code: string, name: string) => void;
}) {
  const [mode, setMode] = useState<"pick" | "student">("pick");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatarState] = useState<AvatarId>(getAvatar);
  const pickAvatar = (id: AvatarId) => {
    setAvatar(id);
    setAvatarState(id);
  };

  const openClassroom = () => {
    playSfx("door");
    onTeacher(makeRoomCode());
  };

  if (mode === "student") {
    const ready = normalizeCode(code).length === 6 && name.trim().length > 0;
    return (
      <div className="sd-wrap">
        <StageLayout
          title={
            <header className="sd-pagehead">
              <p className="sd-kicker">윤리시티 · 연대성</p>
              <h1 className="sd-title">교실 입장</h1>
              <p className="sd-sub">선생님 화면에 있는 6자리 코드를 입력하고, 오늘 쓸 별명을 적어요.</p>
            </header>
          }
        >
          <div className="ee-panel sd-stack sd-joinform">
            <div>
              <label htmlFor="code" className="sd-label">
                교실 코드
              </label>
              <input
                id="code"
                className="sd-input sd-input--code"
                placeholder="ABC123"
                autoCapitalize="characters"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(normalizeCode(e.target.value))}
              />
            </div>
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
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <AvatarPick value={avatar} onChange={pickAvatar} />
          </div>

          <div className="sd-stack sd-joinactions">
            <button
              type="button"
              className="ee-button sd-wide sd-big"
              disabled={!ready}
              onClick={() => {
                playSfx("door");
                onStudent(normalizeCode(code), name.trim());
              }}
            >
              교실 들어가기
            </button>
            <button type="button" className="ee-button secondary sd-wide" onClick={() => setMode("pick")}>
              뒤로
            </button>
          </div>
        </StageLayout>
      </div>
    );
  }

  return (
    <div className="sd-wrap">
      <StageLayout
        title={
          <header className="sd-pagehead">
            <p className="sd-kicker">윤리시티 · AI 윤리 탐험대 · 연대성</p>
            <h1 className="sd-title">성적표의 비밀</h1>
            <p className="sd-sub">
              같은 문제, 같은 시간. 그런데 성적표가 다릅니다. 우리 반이 함께 접속해 격차를 살펴보고, 다음 학년에게
              남길 규칙까지 함께 정하는 수업입니다.
            </p>
          </header>
        }
        scene={
          <Scene
            background="courtyard"
            crop={{ y: 120, height: 480 }}
            actors={[
              { id: "jiho", x: 420, y: 520, direction: "right" },
              { id: "haneul", x: 540, y: 560, direction: "down" },
              { id: "saebom", x: 660, y: 540, direction: "down" },
              { id: "onyu", x: 780, y: 565, direction: "left" },
              { id: "daon", x: 900, y: 525, direction: "left" },
              { id: "robot", x: 640, y: 430, direction: "down", scale: 0.65 },
            ]}
            label="학교 중앙마당에 모인 지호·하늘·새봄·온유·다온과 안내 로봇"
          />
        }
        under={
          <Say speaker="robot" expression="explaining" name="안내 로봇" compact>
            오늘은 루미AI 요금제를 뽑고, 같은 시험을 본 뒤 성적표를 함께 살펴봅니다. 점수는 사람을 평가하는
            숫자가 아니라, 조건이 만든 격차를 보여 주는 자료예요.
          </Say>
        }
      >
        <div className="ee-panel">
          <h2 className="sd-h2">선생님이신가요?</h2>
          <p className="sd-small sd-muted">교실을 열면 QR 코드가 나옵니다. 화면에 띄우면 학생들이 찍고 들어와요.</p>
          <button type="button" className="ee-button sd-wide" onClick={openClassroom}>
            교실 열기
          </button>
        </div>

        <div className="ee-panel">
          <h2 className="sd-h2">학생인가요?</h2>
          <p className="sd-small sd-muted">QR 을 찍었다면 별명만 적으면 되고, 코드를 받았다면 여기서 입력해요.</p>
          <button
            type="button"
            className="ee-button secondary sd-wide"
            onClick={() => {
              playSfx("tap");
              setMode("student");
            }}
          >
            코드로 입장하기
          </button>
        </div>

        <p className="sd-small sd-muted">
          윤리시티, 루미AI, 요금제와 가격은 모두 수업용 가상 설정입니다. 별명 외에 어떤 개인정보도 받지 않습니다.
        </p>
      </StageLayout>
    </div>
  );
}

/** QR 코드 캔버스 — 학생용 입장 주소를 그린다. */
export function QrPanel({ url }: { url: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    void QRCode.toCanvas(el, url, {
      width: 240,
      margin: 1,
      color: { dark: "#294b40", light: "#fff9e7" },
    });
  }, [url]);
  return <canvas ref={ref} className="sd-qr" role="img" aria-label="학생 입장 QR 코드" />;
}
