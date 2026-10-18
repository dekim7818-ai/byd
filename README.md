# Market Pulse · 모바일 외부 접속용

아직 배포되지 않은 독립 Node 서버 패키지입니다. 런타임 외 추가 의존성이 없습니다.

Render Web Service에 이 폴더를 올립니다. Build command: npm run build. Start command: npm start. Health check: /healthz. 서비스는 0.0.0.0:$PORT에 바인딩합니다.

DASHBOARD_USER의 기본값은 investor입니다. DASHBOARD_PASSWORD를 서비스의 비밀 환경변수로 설정하세요. 16자 이상 고유한 비밀번호가 없으면 서버가 시작되지 않습니다. 비밀번호를 소스나 채팅에 적지 마세요. 사이트는 브라우저 기본 로그인 창으로 보호됩니다. 외부 접속은 호스팅 업체의 HTTPS 주소를 사용합니다.

15분마다 데이터를 수집합니다. 무료 Render는 접속이 없는 동안 서버가 중지될 수 있어 항상 수집되는 것은 아닙니다. 재접속 시 서버가 시작되면 최신값을 확인합니다. 유료 서비스나 청구 설정은 사용자 승인 없이 변경하지 않습니다.

하이일드는 Bloomberg 대신 ICE BofA OAS입니다. ICE 데이터는 개인 내부 이용용이며 로그인 없이 공개하지 않습니다. 제공처 접근 제한은 온라인 배포 후 별도로 확인해야 합니다.

공식 문서: https://render.com/docs/web-services 및 https://render.com/docs/free
