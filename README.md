# nadoo-ads

운영 사이트 공용 광고 박스.

- 광고 목록: `ads.json` (이 파일만 고치면 모든 사이트에 반영, 캐시 최대 5분)
- 새 링크 넣기: 해당 항목의 `"url": ""` 에 링크를 넣고 커밋하면 끝
- 숨기기: `url`을 비우거나 `"active": false`
- 요일 제한: `"days": [1,2,3,4,5]` (KST, 0=일 … 6=토)
- 사이트 삽입: `<div class="nadoo-ad"></div>` + `<script src="https://nadoo-ads.vercel.app/ads.js" defer></script>`
- 클릭 수: Abacus `nadoo-ads/click-<id>`
