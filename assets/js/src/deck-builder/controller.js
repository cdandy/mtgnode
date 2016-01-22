/*
| -------------------------------------------------------------------
|  MTGNode DeckBuilder Domino Controller
|  MTGNode 甲板生成器的Domino控制器
| -------------------------------------------------------------------
|
| Author : Yomguithereal
| Version : 1.0
*/

;(function(undefined) {
  'use strict';
  console.log(mtgnode.config.domino);

  // Domino Settings 
  // 配置
  //=================
  domino.settings(mtgnode.config.domino);

  // Helpers
  // 助手
  //=========
  var $_alert = $('.alert');
  var _helpers = {

    // Formatting card return array
	// 格式化卡返回数组
    cardsToMultiverseIdArray: function(cards) {
      return cards.map(function(card){
        return card.multiverseid;
      });
    },

    // Alerting function
	// 警报功能
    message: function(text, status) {
      $_alert.hide();
      $_alert.removeClass('alert-danger alert-success');
      $_alert.addClass('alert-' + (status || 'success'));

      $_alert.children('.message').text(text);
      $_alert.fadeIn();
    }
  }

  // Domino Instance
  //  Domino 实例
  //=================
  var controller = new domino({
    name: 'DeckBuilder',
    properties: [

      // Left Panel
	  //左侧面板
      {
        id: 'viewedCards',
        value: [],
        label: 'Card viewed in the left panel.', //卡在左侧面板中查看
        type: 'array',
        dispatch: 'viewedCardsUpdated'
      },

      // Right Panel
	  // 右侧面板
      {
        id: 'deckCards',
        value: [],
        label: 'Card of the deck.',
        type: 'array',
        dispatch: 'deckCardsUpdated'
      },

      // Deck Name
	  // 甲板 名称
      {
        id: 'deckName',
        label: 'Name of the current selected deck.', //当前选中的甲板名
        type: '?string',
        triggers: 'updateDeckName',
        dispatch: 'deckNameUpdated',
        value: null
      },

      // Deck Id if any
	  //甲板 ID 
	  //
      {
        id: 'deckId',
        label: 'Database id of the current selected deck.', //目前选定的甲板数据库ID
        type: '?number',
        value: null
      }
    ],
    services: [
      {
        id: 'getSetCards',
        setter: 'viewedCards',
        url: '/set/:set/cards'
      },
      {
        id: 'getDeckCards',
        url: '/deck/:id/detail',
        success: function(deck) {
          this.deckCards = deck.cards;
        }
      },
      {
        id: 'searchCards',
        setter: 'viewedCards',
        url: '/cards/search',
        type: 'GET'
      },
      {
        id: 'parseDeck',
        setter: 'deckCards',
        url: '/deck/parse',
        type: 'POST',
        dataType: 'json',
        contentType: 'json'
      },
      {
        id: 'createDeck',
        url: '/deck/create',
        type: 'POST',
        dataType: 'json',
        contentType: 'json',
        success: function(deck) {

          this.deckId = deck.id;

          // Dispatching
		  //调度
          this.dispatchEvent('savedDeck');
        }
      },
      {
        id: 'updateDeck',
        url: 'deck/update/:id',
        type: 'POST',
        dataType: 'json',
        contentType: 'json',
        success: function() {
          this.dispatchEvent('savedDeck');
        }
      },
      {
        id: 'deleteDeck',
        url: '/deck/destroy/:id'
      }
    ],
    hacks: [
      {
        triggers: 'setSelected',
        method: function(e) {
          this.request('getSetCards', {
            shortcuts: {
              set: e.data
            }
          });
        }
      },
      {
        triggers: 'queryDone',
        method: function(e) {
          this.request('searchCards', {
            data: {
              query: e.data
            }
          });
        }
      },
      {
        triggers: 'deckSelected',
        method: function(e) {
          this.request('getDeckCards', {
            shortcuts: {
              id: e.data.deck
            }
          });
          this.deckId = +e.data.deck;
          this.deckName = e.data.name;
        }
      },
      {
        triggers: 'deckCardAdded',
        method: function(e) {
          var deckCards = this.get('deckCards');
          var addedCard = this.get('viewedCards')[e.data];
          deckCards.push(addedCard);
          this.deckCards = deckCards;
        }
      },
      {
        triggers: 'deckCardRemoved',
        method: function(e) {
          var deckCards = this.get('deckCards');
          deckCards.splice(e.data, 1);
          this.deckCards = deckCards;
        }
      },
      {
        triggers: 'saveDeck',
        method: function(e) {
          var deckCards = this.get('deckCards'),
              deckName = this.get('deckName'),
              deckId = this.get('deckId');

          // Need to do it ?
          if (deckCards.length === 0 || deckName === undefined)
            return false;

          // Calling service
		  // 电话服务
          console.log(deckId);
          if (!deckId)
            this.request('createDeck', {
              data: {
                user_id: USER.id,
                name: deckName,
                cards: _helpers.cardsToMultiverseIdArray(deckCards)
              }
            });
          else
            this.request('updateDeck', {
              shortcuts: {
                id: deckId
              },
              data: {
                name: deckName,
                cards: _helpers.cardsToMultiverseIdArray(deckCards)
              }
            })
        }
      },
      {
        triggers: 'deleteDeck',
        method: function(e) {

          // Need to do it?
          var deckId = this.get('deckId');
          if (!deckId)
            return false;

          // Calling service
          this.request('deleteDeck', {
            shortcuts: {
              id: deckId
            }
          });

          // Emptying deck cards
          this.deckCards = [];
          this.deckName = '';
          this.deckId = undefined;
        }
      },
      {
        triggers: 'parseDeck',
        method: function(e) {

          // Calling service
          this.request('parseDeck', {
            data: e.data
          });
        }
      }
    ]
  });


  // Left Panel
  //左侧面板
  //============
  function LeftPanel() {

    // Variables
	//变量
    var _this = this,
        _template = new mtgnode.driver('leftcard'),
        _cards = '.card-min-deckbuilder';

    // Selectors
	//选择器
    var $set_select = $('#set_select'),
        $panel = $('#left_panel');

    // Emitter
	//发射器
    //---------
    $set_select.change(function() {
      var set = $(this).val();

      if(set != '-none-'){
        _this.dispatchEvent('setSelected', set);
      }
    });

    $panel.on('click', _cards, function(){
      _this.dispatchEvent('deckCardAdded', $(this).attr('index'));
    });

    // Receptor
    //----------
    this.triggers.events['viewedCardsUpdated'] = function(d){
      $panel.empty();
      d.get('viewedCards').forEach(function(card, index){
        $panel.append(_template.render(card, index));
      });
    }
  }

  // Right Panel
  // 右侧面板
  //=============
  function RightPanel() {

    // Variables
    var _this = this,
        _template = new mtgnode.driver('rightcard'),
        _cards = '.card-min-deckbuilder';

    // Selectors
    var $deck_select = $('#deck_select'),
        $panel = $('#right_panel');

    // Emitter
    //---------
    $deck_select.change(function(){
      var deck = $(this).val();
      var name = $(this).children(':selected').text();
      if(deck != '-none-'){
        _this.dispatchEvent('deckSelected', {deck: deck, name: name});
      }
    });

    $panel.on('click', _cards, function(){
      _this.dispatchEvent('deckCardRemoved', $(this).attr('index'));
    });

    // Receptor
	// 接收器
    //----------
    this.triggers.events['deckCardsUpdated'] = function(d){
      $panel.empty();
      d.get('deckCards').forEach(function(card, index){
        $panel.append(_template.render(card, index));
      });
    }
  }

  // Controls
  //控制
  //==========
  function Controls() {

    // Variables
    var _this = this;

    // Selectors
	//选择器
    var $alert = $('.alert'),
        $counter = $('#card_counter'),
        $deck_name = $('#deck_name'),
        $query = $('#card_search'),
        $to_parse = $('#deck_to_parse'),
        $parse_format = $('#parse_format');

    // Buttons
    var $save_deck = $('#save_deck'),
        $delete_deck = $('#delete_deck_modal_confirm'),
        $search = $('#card_search_button'),
        $parse = $('#parse_confirm');

    // Modals
    var $delete_modal = $('#delete_deck_modal'),
        $parse_modal = $('#parse_deck_modal');

    // Emitter
    //---------

    // Update name
    $deck_name.change(function() {
      _this.dispatchEvent('updateDeckName', {deckName: $(this).val()});
    });

    // Save the deck
    $save_deck.click(function() {
      if ($.trim($deck_name.val()))
        _this.dispatchEvent('saveDeck');
    });

    // Delete the deck
	//
    $delete_deck.click(function() {
      _this.dispatchEvent('deleteDeck');

      $delete_modal.modal('hide');
      _helpers.message('Deck deleted');
    });

    // Search cards
	// 搜索卡
    $query.keypress(function(e) {
      if (e.which === 13)
        $search.trigger('click');
    });

    $search.click(function() {
      var query = $query.val();

      if ($.trim(query) !== '') {
        $search.button('loading');
        _this.dispatchEvent('queryDone', $query.val());
      }
    });

    // Parse a deck
	// 解析 面板
    $parse.click(function() {
      var deck_text = $to_parse.val();

      if ($.trim(deck_text) === '')
        return false;

      _this.dispatchEvent('parseDeck', {
        text: deck_text,
        format: $parse_format.val()
      });

      $parse_modal.modal('hide');
    });

    // Receptor
	//接受器
    //----------
    this.triggers.events['deckCardsUpdated'] = function(d) {
      $counter.text(d.get('deckCards').length);
    }

    this.triggers.events['deckNameUpdated'] = function(d) {
      $deck_name.val(d.get('deckName'));
    }

    this.triggers.events['savedDeck'] = function(d) {
      _helpers.message('Deck saved');
    }

    this.triggers.events['viewedCardsUpdated'] = function(d) {
      var count = d.get('viewedCards').length;

      _helpers.message(count + ' cards found.');
      $search.button('reset');
    }
  }

  // Launching
  //发射
  //===========

  // Instanciating Modules
  //实例化模块
  var leftPanel = controller.addModule(LeftPanel),
      rightPanel = controller.addModule(RightPanel),
      controls = controller.addModule(Controls);

  // Instanciating Widgets
  //实例化小工具
  $('#card_viewer_widget').cardViewerWidget({
    container: '#deck_builder_container',
    cards: '.card-min-deckbuilder'
  });
}).call(this);