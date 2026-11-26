# nadoo-ads

운영 사이트 공용 광고 박스.

- 광고 목록: `ads.json` (이 파일만 고치면 모든 사이트에 반영, 캐시 최대 5분)
- 새 링크 넣기: 해당 항목의 `"url": ""` 에 링크를 넣고 커밋하면 끝
- 숨기기: `url`을 비우거나 `"active": false`
- 요일 제한: `"days": [1,2,3,4,5]` (KST, 0=일 … 6=토)
- 사이트 삽입: `<div class="nadoo-ad"></div>` + `<script src="https://nadoo-ads.vercel.app/ads.js" defer></script>`
- 클릭 수: Abacus `nadoo-ads/click-<id>`
- 종류(type): `cpa`(기본) · `coupang` · `naver` · `hub` · `linkprice` — type별 고지 문구 자동 표시(`note`가 있으면 우선)
- `internal: true` 면 라벨이 「추천」, rel은 noopener (자체 사이트 링크)
- `sites`: 허용 호스트 배열. 있으면 `location.hostname`이 일치하는 사이트에서만 노출
- 묶음(cpa / apple / coupang / linkprice)을 페이지 안에서 고르게 번갈아 노출
- 묶음 필터: `<div class="nadoo-ad" data-types="apple,coupang,linkprice"></div>`

- 하단 바로가기 바: `<div class="nadoo-ad-bar"></div>` (스크립트는 카드와 동일)
- 코드 맵은 `ads.json`의 `bar.sites` 한 곳만 고친다. 예: `"surfwikikorea.vercel.app": { "code": "A100710580", "merchants": { "yanolja": "bestmore.net", "agoda": "newtip.net" } }` (값은 클릭 도메인). 링크는 `https://<도메인>/click.php?m=<머천트>&a=<코드>&l=0000`.
- `code`가 비어 있거나 `merchants`가 비어 있거나 해당 머천트가 맵에 없으면 그 사이트에서는 바가 숨겨진다. 승인 대기 머천트(hotelskr, ctrip 등)는 merchants에 넣지 않으면 로고가 나오지 않는다.
- 새 사이트 코드를 받으면 `bar.sites`에 hostname과 code를 넣고, 승인된 머천트만 merchants 배열에 추가하면 된다.
- 모바일에서는 하단 고정 + 닫기(하루), 본문이 가리지 않도록 스페이서를 넣는다. PC는 페이지 하단 정적 줄.
- 바 제목은 `bar.headlines`와 사이트 `mood`(`travel` / `shop`)로 고른다. 머천트 한 줄 문구는 `items[].lines`에서 페이지마다 하나를 무작위로 쓴다. 할인율·금액·최저가·보장 문구는 넣지 않는다.
- 나두게임즈(`robingames.vercel.app`)는 `bar.excludeHosts`로 제외한다.
