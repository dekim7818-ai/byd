export const keys = ['hy', 'vix', 'oil', 'fear', 'move', 'yield', 'dollar'];
export const meta = {
    hy: { name: '하이일드 스프레드', english: 'HIGH YIELD SPREAD', unit: 'bp', color: '#a39cff', symbol: 'HY OAS', description: '투기등급 회사채의 국채 대비 추가 수익률. 상승할수록 신용시장의 긴장이 커집니다. 기본 데이터는 Bloomberg가 아닌 ICE BofA 미국 하이일드 OAS입니다. FRED의 % 값을 100배 해 bp로 표시합니다.', url: 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2' },
    vix: { name: 'VIX 지수', english: 'EQUITY VOLATILITY', unit: 'pt', color: '#e5bb73', symbol: 'VIX', description: 'S&P 500 옵션에 반영된 향후 약 30일의 기대 변동성. 20은 주의, 30은 공포라는 사용자 기준을 적용했습니다. 공식적인 매매 신호는 아닙니다.', url: 'https://www.cboe.com/tradable-products/vix' },
    oil: { name: 'WTI 원유 선물', english: 'CRUDE OIL FUTURES', unit: 'USD', color: '#83cdb5', symbol: '@CL.1', description: 'CNBC의 WTI 최근월물 선물 일별 종가(@CL.1). 현물 유가와 다르며 월물 교체 시 가격 단절이 발생할 수 있습니다. 백어드저스트한 연속선물 수익률 시계열이 아닙니다.', url: 'https://www.cnbc.com/quotes/@CL.1' },
    fear: { name: '공포·탐욕 지수', english: 'FEAR & GREED', unit: '/100', color: '#d8acde', symbol: 'CNN F&G', description: 'CNN의 주식시장 심리 지표. 0에 가까울수록 공포, 100에 가까울수록 탐욕입니다. 구간은 25 미만 극도의 공포, 25–45 미만 공포, 45–55 중립, 55 초과–75 미만 탐욕, 75 이상 극도의 탐욕으로 표시합니다. 제공처 접근 제한 시 차트는 비워 둡니다.', url: 'https://www.cnn.com/markets/fear-and-greed' },
    move: { name: 'MOVE 지수', english: 'BOND VOLATILITY', unit: 'pt', color: '#81b9eb', symbol: 'MOVE', description: '미국 국채 옵션 가격에 반영된 약 한 달의 기대 금리 변동성. CNBC의 ICE BofA MOVE 지수(.MOVE) 일별 데이터를 사용합니다. 금리의 상승·하락 방향에 대한 베팅을 뜻하지 않습니다. 박스권 상단 돌파는 최근 분포에 비해 변동성이 높다는 뜻입니다.', url: 'https://www.cnbc.com/quotes/.MOVE' },
    yield: { name: '미국채 10년 금리', english: 'US 10Y TREASURY', unit: '%', color: '#d6ab8b', symbol: 'DGS10', description: '미국 국채 10년 만기 고정만기 수익률. 연율 %로 표시하며 FRED의 일별 관측값을 사용합니다. 금리가 높다는 이유만으로 위험 신호를 부여하지 않습니다.', url: 'https://fred.stlouisfed.org/series/DGS10' },
    dollar: { name: '달러 지수', english: 'US DOLLAR INDEX', unit: 'pt', color: '#9fcb80', symbol: 'DXY', description: 'CNBC의 ICE 미국 달러 지수(.DXY) 일별 종가. 주요 6개 통화 대비 달러 지수이며 연준의 광의 무역가중 달러 지수와 다른 지표입니다.', url: 'https://www.cnbc.com/quotes/.DXY' }
};
export function quantile(values, q) { const a = [...values].sort((a, b) => a - b); if (!a.length)
    return NaN; const p = (a.length - 1) * q; const i = Math.floor(p); return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * (p - i); }
export function twoYears(points) { if (!points.length)
    return []; const end = new Date(points[points.length - 1].date + 'T00:00:00Z'); end.setUTCFullYear(end.getUTCFullYear() - 2); return points.filter(p => p.date >= end.toISOString().slice(0, 10)); }
export function stats(points) { const p = twoYears(points), v = p.map(p => p.value), last = v[v.length - 1]; return { lo: quantile(v, .25), hi: quantile(v, .75), median: quantile(v, .5), min: Math.min(...v), max: Math.max(...v), percentile: v.length ? 100 * (v.filter(x => x < last).length + .5 * v.filter(x => x === last).length) / v.length : 0 }; }
export function fearLabel(v) { return v < 25 ? '극도의 공포' : v < 45 ? '공포' : v <= 55 ? '중립' : v < 75 ? '탐욕' : '극도의 탐욕'; }
