## ADDED Requirements

### Requirement: Piece Queue
系統 SHALL 維護一個固定長度的「待放置零件佇列」，佇列中每個項目 MUST 為 `straight`、`curve-left`、`curve-right` 其中一種可放置的零件型別，且佇列內容 SHALL 於遊戲開始時隨機產生。

#### Scenario: 佇列初始長度固定
- **WHEN** 遊戲進入 `playing` 狀態
- **THEN** 待放置零件佇列的長度 MUST 等於系統設定的固定值（例如 5）

#### Scenario: 佇列項目型別隨機
- **WHEN** 系統為佇列產生一個新零件
- **THEN** 該零件的型別 MUST 從 `straight`、`curve-left`、`curve-right` 中隨機選取

### Requirement: Queue Replenishment
每當玩家成功放置一個零件到軌道空格後，系統 SHALL 從佇列移除該零件並在佇列尾端補入一個新的隨機零件，確保佇列長度維持不變。

#### Scenario: 放置成功後佇列自動補充
- **WHEN** 玩家成功將佇列中的零件放置到合法空格
- **THEN** 系統 MUST 將該零件從佇列移除，並在佇列尾端加入一個新產生的隨機零件

### Requirement: Queue Always Offers a Solvable Piece
只要軌道上存在一個等待填補的 `empty` 區塊，系統 SHALL 保證待放置零件佇列中，至少有一個零件的方向能合法銜接該區塊，不得讓玩家陷入「佇列內沒有任何零件能用」的情況。

#### Scenario: 佇列中缺少對應方向的零件時自動補入
- **WHEN** 軌道上出現一個等待填補的 `empty` 區塊，且目前佇列中沒有任何零件的方向能合法銜接該區塊
- **THEN** 系統 MUST 將佇列中的某個零件替換為能合法銜接該區塊的型別，使佇列隨時保有至少一個可用選項

#### Scenario: 不覆蓋玩家正在拖曳的零件
- **WHEN** 系統需要替換佇列中的某個零件以保證可解性，且玩家正在拖曳佇列中的某個零件
- **THEN** 系統 MUST NOT 替換玩家正在拖曳的那個零件，改為替換佇列中其他位置的零件

### Requirement: Drag Interaction
玩家 SHALL 透過滑鼠指標事件（pointer down / move / up）將零件從佇列拖曳到軌道上的空格區塊，完成放置操作。

#### Scenario: 開始拖曳
- **WHEN** 玩家在佇列中的某個零件上按下滑鼠左鍵（pointerdown）
- **THEN** 系統 MUST 進入拖曳狀態，該零件 MUST 跟隨滑鼠游標移動並顯示於畫面最上層

#### Scenario: 拖曳中跟隨游標
- **WHEN** 玩家在拖曳狀態下移動滑鼠（pointermove）
- **THEN** 被拖曳零件的顯示位置 MUST 即時跟隨滑鼠游標座標更新

#### Scenario: 放開滑鼠結束拖曳
- **WHEN** 玩家放開滑鼠左鍵（pointerup）
- **THEN** 系統 MUST 根據放開時的滑鼠座標，判斷是否落在任何軌道空格的可放置範圍內，並結束拖曳狀態

### Requirement: Placement Legality Check
系統 SHALL 只在下列條件同時成立時，才將零件視為合法放置：（1）放開位置落在某個 `empty` 區塊的可放置範圍內；（2）該零件的方向能與前一個非空格區塊的 `exitDirection` 合法銜接。

#### Scenario: 合法放置成功
- **WHEN** 玩家將零件放開於一個 `empty` 區塊範圍內，且該零件的方向與前一區塊的 `exitDirection` 相容
- **THEN** 系統 MUST 將該 `empty` 區塊更新為該零件的型別，並標記放置成功

#### Scenario: 方向不相容則放置失敗
- **WHEN** 玩家將零件放開於一個 `empty` 區塊範圍內，但該零件的方向與前一區塊的 `exitDirection` 不相容
- **THEN** 系統 MUST 拒絕放置、將零件退回佇列原本位置，並標記放置失敗

#### Scenario: 放開位置不在任何空格範圍內
- **WHEN** 玩家放開滑鼠時的座標未落在任何 `empty` 區塊的可放置範圍內
- **THEN** 系統 MUST 將零件退回佇列原本位置，且不改變任何軌道區塊

### Requirement: Placement Feedback
系統 SHALL 針對放置成功與放置失敗提供不同的即時視覺回饋，讓玩家能立即分辨操作結果。

#### Scenario: 成功回饋
- **WHEN** 一次放置操作被判定為合法放置成功
- **THEN** 系統 MUST 顯示成功的視覺回饋（例如區塊短暫高亮）

#### Scenario: 失敗回饋
- **WHEN** 一次放置操作被判定為放置失敗（方向不相容或未落在空格範圍內）
- **THEN** 系統 MUST 顯示失敗的視覺回饋（例如零件短暫閃爍紅色後退回佇列）
