## ADDED Requirements

### Requirement: Continuous Downward Movement
遊戲進入 `playing` 狀態後，小朋友 SHALL 沿著目前已鋪設的軌道自動持續往下移動，不需要玩家對小朋友本身下達任何移動指令。

#### Scenario: 進入遊戲後自動開始下滑
- **WHEN** 遊戲狀態從 `menu` 轉為 `playing`
- **THEN** 小朋友 MUST 立即開始沿軌道自動往下移動，且移動 MUST 持續直到遊戲結束

### Requirement: Difficulty Scaling by Distance
小朋友的下滑速度 SHALL 隨存活距離（或存活時間）增加而提升，但 MUST 存在一個系統設定的速度上限，速度不得無限制成長。

#### Scenario: 速度隨距離提升
- **WHEN** 小朋友的存活距離增加
- **THEN** 小朋友的下滑速度 MUST 隨之提高，直到達到系統設定的速度上限為止

#### Scenario: 速度不超過上限
- **WHEN** 計算出的下滑速度依公式已達到或超過系統設定的速度上限
- **THEN** 系統 MUST 將實際套用的速度限制在該上限值

### Requirement: Fall Detection and Game Over
系統 SHALL 在每個更新影格檢查小朋友目前所在的區塊；當小朋友抵達的區塊仍是 `empty`（尚未被合法放置零件覆蓋）時，MUST 立即判定為掉落並將遊戲狀態轉為 `gameOver`，且不提供任何生命值或緩衝機制。

#### Scenario: 抵達空格立即結束遊戲
- **WHEN** 小朋友移動到的下一個區塊在其抵達時仍為 `empty`
- **THEN** 系統 MUST 立即停止小朋友的移動與軌道捲動，並將遊戲狀態轉為 `gameOver`

#### Scenario: 抵達已鋪設區塊則繼續遊戲
- **WHEN** 小朋友移動到的下一個區塊在其抵達時已是 `straight`、`curve-left` 或 `curve-right`（非 `empty`）
- **THEN** 遊戲 MUST 維持在 `playing` 狀態並繼續自動下滑

### Requirement: Distance-Based Scoring
系統 SHALL 以小朋友本局存活的下滑距離作為本局分數，並在遊戲進行中即時更新顯示。

#### Scenario: 分數隨存活距離即時更新
- **WHEN** 小朋友在 `playing` 狀態下持續往下移動
- **THEN** 本局分數 MUST 即時依存活距離增加並顯示於畫面上

### Requirement: High Score Persistence
遊戲結束時，系統 SHALL 將本局分數與瀏覽器 `localStorage` 中儲存的最高分比較，若本局分數較高則 MUST 更新並持久化儲存新的最高分。

#### Scenario: 本局分數超過歷史最高分
- **WHEN** 遊戲狀態轉為 `gameOver`，且本局分數大於目前 `localStorage` 中儲存的最高分
- **THEN** 系統 MUST 將 `localStorage` 中的最高分更新為本局分數

#### Scenario: 本局分數未超過歷史最高分
- **WHEN** 遊戲狀態轉為 `gameOver`，且本局分數小於或等於目前 `localStorage` 中儲存的最高分
- **THEN** 系統 MUST 保留原本的最高分不變

### Requirement: Restart Flow
遊戲結束畫面 SHALL 提供玩家重新開始遊戲的方式，玩家觸發後系統 MUST 重置軌道、零件佇列與本局分數，並將遊戲狀態轉回 `playing`。

#### Scenario: 玩家點擊重新開始
- **WHEN** 遊戲處於 `gameOver` 狀態，且玩家觸發重新開始操作
- **THEN** 系統 MUST 重置軌道資料、零件佇列與本局分數，並將遊戲狀態轉為 `playing`
