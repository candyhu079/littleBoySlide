## ADDED Requirements

### Requirement: Segment Types
軌道 SHALL 由一系列離散區塊（segment）組成，每個區塊 MUST 屬於下列其中一種型別：`straight`（直線）、`curve-left`（左彎）、`curve-right`（右彎）、`empty`（空格，尚未鋪設滑梯）。

#### Scenario: 產生的區塊必須是合法型別
- **WHEN** 系統產生一個新的軌道區塊
- **THEN** 該區塊的型別 MUST 為 `straight`、`curve-left`、`curve-right`、`empty` 四者之一

### Requirement: Segment Connectivity Metadata
每個非空格區塊 SHALL 具備 `entryDirection`（入口方向）與 `exitDirection`（出口方向）屬性，用於判斷是否能與相鄰區塊合法銜接。

#### Scenario: 直線區塊的出入口方向一致
- **WHEN** 系統產生一個 `straight` 型別的區塊
- **THEN** 該區塊的 `entryDirection` 與 `exitDirection` MUST 相同（不改變前進方向）

#### Scenario: 彎道區塊會改變方向
- **WHEN** 系統產生一個 `curve-left` 或 `curve-right` 型別的區塊
- **THEN** 該區塊的 `exitDirection` MUST 相對於 `entryDirection` 偏轉對應的左或右方向

### Requirement: Endless Procedural Generation
系統 SHALL 在小朋友前方（下方）持續程序化生成新區塊，並移除已通過（小朋友後方、超出可視範圍）的區塊，以維持捲動視窗內的軌道資料量有界。

#### Scenario: 小朋友接近可視範圍底部時自動補生成
- **WHEN** 已生成的軌道區塊數量少於捲動視窗所需的最小數量
- **THEN** 系統 MUST 自動生成新的區塊補足視窗

#### Scenario: 通過的區塊被移除
- **WHEN** 一個區塊已完全捲出畫面上方（小朋友已通過且不再可見）
- **THEN** 系統 MUST 將該區塊從記憶體中的軌道資料移除

### Requirement: Empty Segment Generation Rate
系統 SHALL 依照目前難度（存活距離/時間）以一定機率生成 `empty` 區塊，且 MUST 限制連續 `empty` 區塊的最大數量，避免產生無法被單一零件跨越的空隙。

#### Scenario: 空格出現機率隨難度提升
- **WHEN** 小朋友的存活距離增加
- **THEN** 新生成區塊為 `empty` 型別的機率 MUST 隨之提高，但不得超過系統設定的上限值

#### Scenario: 不會連續產生超過上限數量的空格
- **WHEN** 系統即將生成新區塊，且緊接在前的區塊已連續為 `empty` 達到系統設定的最大連續數量
- **THEN** 系統 MUST 強制生成一個非 `empty`（`straight`、`curve-left`、`curve-right` 其中之一）的區塊

### Requirement: Segment Solvability by Available Pieces
系統產生的每一個 `empty` 區塊 SHALL 保證可被目前零件佇列中「已存在或即將供給」的零件型別合法銜接，不得產生任何區塊要求的銜接方向是零件佇列規則中不存在的型別。

#### Scenario: 空格所需的銜接方向必為可用零件型別
- **WHEN** 系統生成一個 `empty` 區塊，且該區塊的前一區塊已有明確的 `exitDirection`
- **THEN** 系統 MUST 確保存在至少一種零件型別（`straight`、`curve-left`、`curve-right`）可以合法銜接該 `exitDirection`
