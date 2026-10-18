import { meta } from './market.mjs';
const memory = new Map();
async function get(url, timeout = 18000) { const r = await fetch(url, { headers: { 'User-Agent': 'MarketPulse/1.0 (personal-use daily market dashboard)', 'Accept': 'application/json,text/csv,text/plain;q=0.9,*/*;q=0.8' }, signal: AbortSignal.timeout(timeout) }); if (!r.ok)
    throw new Error(r.status === 429 ? '제공처 호출 제한 (429)' : r.status === 418 ? '제공처 자동 접근 제한 (418)' : '제공처 응답 ' + r.status); return r; }
export async function fetchSeries(key, force = false) {
    const cached = memory.get(key);
    if (!force && cached && Date.now() - cached.at < (cached.data.status === 'ok' ? 900000 : 60000))
        return cached.data;
    let points = [];
    let source = '';
    try {
        const start = new Date();
        start.setUTCFullYear(start.getUTCFullYear() - 2);
        start.setUTCDate(start.getUTCDate() - 7);
        const from = start.toISOString().slice(0, 10);
        if (key === 'hy' || key === 'yield' || key === 'vix') {
            const id = { hy: 'BAMLH0A0HYM2', yield: 'DGS10', vix: 'VIXCLS' }[key];
            try {
                const csv = await (await get('https://fred.stlouisfed.org/graph/fredgraph.csv?id=' + id + '&cosd=' + from, 6000)).text();
                points = csv.trim().split(/\r?\n/).slice(1).flatMap(line => { const [date, raw] = line.split(','); const v = Number(raw); return /^\d{4}-\d{2}-\d{2}$/.test(date) && raw?.trim() !== '' && Number.isFinite(v) ? [{ date, value: key === 'hy' ? v * 100 : v }] : []; });
                if (points.length < 2)
                    throw new Error('CSV 관측값 부족');
            }
            catch {
                // FRED's public observation table is an independent first-party view of the same series.
                const html = await (await get('https://fred.stlouisfed.org/data/' + id, 10000)).text();
                const table = html.split('id="data-table-observations"')[1]?.split('</table>')[0] ?? '';
                points = Array.from(table.matchAll(/<th[^>]*>\s*(\d{4}-\d{2}-\d{2})\s*<\/th>\s*<td[^>]*>\s*(-?\d+(?:\.\d+)?)\s*<\/td>/g), m => ({ date: m[1], value: Number(m[2]) * (key === 'hy' ? 100 : 1) }));
            }
            source = key === 'hy' ? 'ICE BofA · FRED' : key === 'vix' ? 'Cboe · FRED' : '미 연준 · FRED';
        }
        else if (key === 'fear') {
            const j = await (await get('https://production.dataviz.cnn.io/index/fearandgreed/graphdata/' + from)).json();
            points = (j.fear_and_greed_historical?.data ?? []).map(p => ({ date: new Date(p.x).toISOString().slice(0, 10), value: Number(p.y) }));
            source = 'CNN';
        }
        else {
            // Use CNBC's public daily chart feed. Yahoo returns 429 from the hosting network.
            // tradeTime is the market's observation date; do not shift it through UTC.
            const symbol = { oil: '@CL.1', move: '.MOVE', dollar: '.DXY' }[key];
            const query = 'query getQuoteChartData($symbol:String,$startDate:String,$endDate:String,$granularity:String){chartData(symbol:$symbol,startDate:$startDate,endDate:$endDate,granularity:$granularity){symbol allSymbols{symbol name} priceBars{close tradeTime}}}';
            const url = new URL('https://webql-redesign.cnbcfm.com/graphql');
            url.searchParams.set('query', query);
            url.searchParams.set('variables', JSON.stringify({ symbol, startDate: from.replaceAll('-', '') + '000000', endDate: new Date().toISOString().slice(0, 10).replaceAll('-', '') + '235959', granularity: '1D' }));
            const j = await (await get(url.href)).json();
            const chart = j.data?.chartData;
            if (j.errors?.length)
                throw new Error('CNBC 차트 응답 오류');
            if (chart?.symbol !== symbol || !chart.allSymbols?.some(s => s.symbol === symbol && s.name))
                throw new Error('CNBC 지표 식별 불일치');
            if (!Array.isArray(chart.priceBars))
                throw new Error('CNBC 일별 시계열 없음');
            points = chart.priceBars.flatMap(p => { const t = p.tradeTime, raw = p.close; if (!t || !/^\d{14}$/.test(t) || raw === null || raw === undefined || String(raw).trim() === '')
                return []; const value = Number(String(raw).replaceAll(',', '')), date = t.slice(0, 4) + '-' + t.slice(4, 6) + '-' + t.slice(6, 8); const stamp = Date.parse(date + 'T00:00:00Z'); return Number.isFinite(value) && Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === date ? [{ date, value }] : []; });
            source = 'CNBC';
        }
        points = Array.from(new Map(points.filter(p => Number.isFinite(p.value) && p.date >= from && p.date <= new Date().toISOString().slice(0, 10) && (key !== 'fear' || (p.value >= 0 && p.value <= 100))).map(p => [p.date, p])).values()).sort((a, b) => a.date.localeCompare(b.date));
        if (points.length < 2)
            throw new Error('관측값 부족');
        const data = { points, source, sourceUrl: meta[key].url, status: 'ok', fetchedAt: new Date().toISOString() };
        memory.set(key, { at: Date.now(), data });
        return data;
    }
    catch (e) {
        const data = { points: [], source: key === 'fear' ? 'CNN' : key === 'hy' ? 'ICE BofA · FRED' : key === 'oil' || key === 'move' || key === 'dollar' ? 'CNBC' : '데이터 제공처', sourceUrl: meta[key].url, status: 'unavailable', fetchedAt: new Date().toISOString(), error: e instanceof Error ? e.message : '연결 실패' };
        memory.set(key, { at: Date.now(), data });
        return data;
    }
}
