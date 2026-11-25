# nadoo-ads

운영 사이트 공용 광고 박스.

- 광고 목록: `ads.json` (이 파일만 고치면 모든 사이트에 반영, 캐시 최대 5분)
- 새 링크 넣기: 해당 항목의 `"url": ""` 에 링크를 넣고 커밋하면 끝
- 숨기기: `url`을 비우거나 `"active": false`
- 요일 제한: `"days": [1,2,3,4,5]` (KST, 0=일 … 6=토)
- 사이트 삽입: `<div class="nadoo-ad"></div>` + `<script src="https://nadoo-ads.vercel.app/ads.js" defer></script>`
- 클릭 수: Abacus `nadoo-ads/click-<id>`
- 종류(type): `cpa`(기본) · `coupang` · `naver` · `hub` — type별 고지 문구 자동 표시(`note`가 있으면 우선)
- `internal: true` 면 라벨이 「추천」, rel은 noopener (자체 사이트 링크)
- 묶음(cpa / apple / coupang)을 페이지 안에서 고르게 번갈아 노출
- 묶음 필터: `<div class="nadoo-ad" data-types="apple,coupang"></div>`
