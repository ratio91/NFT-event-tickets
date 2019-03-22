pragma solidity >=0.5.0;

import "openzeppelin-solidity/contracts/token/ERC721/ERC721.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/lifecycle/Pausable.sol";

/**
 * @title EventTicketSystem
 * @author ratio91
 * @dev this contract is based on ERC721 and is Pausable and Owned by msg.sender (at deployment)
 */
contract EventTicketSystem is ERC721, Pausable, Ownable {

    /**
    * @dev parameters provided at deployment
    */ 
    string public name;
    string public symbol;
    address payable withdrawalAddress;
    uint64 public eventStartDate;
    uint64 public ticketSupply;
    uint256 public initialTicketPrice;
    uint64 public maxPriceFactor;
    uint64 public transferFee;

    /** 
    * @dev constructor
    */
    constructor(
        string memory _eventName, 
        string memory _eventSymbol, 
        uint64 _eventStartDate,
        uint64 _ticketSupply, 
        uint256 _initialTicketPrice,
        uint64 _maxPriceFactor, 
        uint64 _transferFee
    ) public {
        name = _eventName;
        symbol = _eventSymbol;
        withdrawalAddress = msg.sender;
        eventStartDate = uint64(_eventStartDate);
        ticketSupply = uint64(_ticketSupply);
        initialTicketPrice = uint256(_initialTicketPrice);
        maxPriceFactor = uint64(_maxPriceFactor);
        transferFee = uint64(_transferFee);
    }

    /** 
    * @dev define Ticket struct
    */
    struct Ticket  {
        uint256 price;
        bool forSale;
        bool used;
    }

    /** 
    * @dev initialize an instance of Ticket struct
    */
    Ticket[] tickets;

    /** 
    * @dev define Events
    */
    event TicketCreated(address _by, uint256 _ticketId);
    event TicketDestroyed(address _by, uint256 _ticketId);
    event TicketForSale(address _by, uint256 _ticketId, uint256 _price);
    event TicketSaleCancelled(address _by, uint256 _ticketId);
    event TicketSold(address _by, address _to, uint256 _ticketId, uint256 _price);
    event TicketPriceChanged(address _by, uint256 _ticketId, uint256 _price);
    event BalanceWithdrawn(address _by, address _to, uint256 _amount);

/* MODIFIERS */
    
    /**  
    * @dev check if price within limit
    */
    modifier priceCap(uint256 _price) {
        uint256 _maxPrice =  initialTicketPrice * maxPriceFactor;
        require((_price <= _maxPrice),"price must be lower than the maximum price");
        _;
    }

    /** 
    * @dev check if the event has already started
    */
    modifier EventNotStarted() {
        require((uint64(now) < eventStartDate),"event has already started");
        _;
    }

    /** 
    * @dev check if the supply is not exceeded
    */
    modifier isAvailable() {
        require((tickets.length < ticketSupply),"no more new tickets available");
        _;
    }   

    /** 
    * @dev check if the ticket has not been used yet
    */
    modifier isNotUsed(uint256 _ticketId) {
        require(tickets[_ticketId].used != true,"ticket already used");
        _;
    }

    /** 
    * @dev check if the function caller is the ticket owner
    */
    modifier isTicketOwner(uint256 _ticketId) {
        require((ownerOf(_ticketId) == msg.sender),"no permission");
        _;
    }

/* SETTERS */
    
    /** 
    * @dev set individual ticket status to used
    */
    function setTicketToUsed(uint256 _ticketId) 
    public 
    onlyOwner 
    {
        tickets[_ticketId].used = true;
    }

    /** 
    * @dev set individual ticket price
    */
    function setTicketPrice(uint256 _price, uint256 _ticketId) 
    public 
    EventNotStarted 
    isNotUsed(_ticketId)
    isTicketOwner(_ticketId) 
    priceCap(_price) 
    {
        tickets[_ticketId].price = _price;
        emit TicketPriceChanged(msg.sender, _ticketId, _price);
    }

    /** 
    * @dev set eventStartDate (global)
    */
    function setEventStartDate(uint64 _eventStartDate) 
    public 
    EventNotStarted 
    onlyOwner 
    {
        eventStartDate = _eventStartDate;
    }

    /** 
    * @dev set TicketSupply (global)
    */
    function setTicketSupply(uint64 _ticketSupply) 
    public 
    EventNotStarted 
    onlyOwner 
    {
        ticketSupply = _ticketSupply;
    }

    /** 
    * @dev set maximum price (global)
    */
    function setMaxTicketPrice(uint64 _maxPriceFactor) 
    public 
    EventNotStarted 
    onlyOwner 
    {
        maxPriceFactor = _maxPriceFactor;
    }

    /** 
    * @dev set margin/fee (global)
    */
    function setTicketTransferFee(uint64 _transferFee) 
    public 
    EventNotStarted
    onlyOwner 
    {
        transferFee = _transferFee;
    }

    /** 
    * @dev set withdrawal address (global)
    */
    function setWithdrawalAddress(address payable _addr) 
    public 
    onlyOwner 
    {
        require((_addr != address(0)),"must be a valid address");
        withdrawalAddress = _addr;
    }

    /** 
    * @dev offer ticket for sale, pre-approve transfer
    */
    function setTicketForSale(uint256 _ticketId) 
    external 
    EventNotStarted 
    whenNotPaused
    isNotUsed(_ticketId)
    isTicketOwner(_ticketId) 
    {
        tickets[_ticketId].forSale = true;
        emit TicketForSale(msg.sender, _ticketId, tickets[_ticketId].price);
    }

    function cancelTicketSale(uint256 _ticketId) 
    external 
    EventNotStarted
    whenNotPaused
    isTicketOwner(_ticketId)
    {
        tickets[_ticketId].forSale = false;
        emit TicketSaleCancelled(msg.sender, _ticketId);
    }

/* GETTERS */
    /** 
    * @dev Returns all the relevant information about a specific ticket
    */
    function getTicket(uint256 _id) 
    external 
    view 
    returns (
        uint256 price, 
        bool forSale,
        bool used
    )
    {
        price = uint256(tickets[_id].price);
        forSale = bool(tickets[_id].forSale);
        used = bool(tickets[_id].used);
    }

    /** 
    * @dev Returns the price of a specific ticket
    */
    function getTicketPrice(uint256 _ticketId) 
    public 
    view 
    returns (uint256) 
    {
        return tickets[_ticketId].price;
    }

    /** 
    * @dev Returns the maximum price allowed for a specific ticket
    */
    function getMaxTicketPrice(uint256 _ticketId) 
    public 
    view 
    returns (uint256) 
    {
        return tickets[_ticketId].price * maxPriceFactor;
    }

    /** 
    * @dev Returns the transfer fee of a specific ticket
    */
    function getTicketTransferFee(uint256 _ticketId) 
    public 
    view 
    returns (uint256) 
    {
        return tickets[_ticketId].price * transferFee;
    }

    /** 
    * @dev Returns the status of a specific ticket
    */
    function getTicketStatus(uint256 _ticketId) 
    public 
    view 
    returns (bool) 
    {
        return tickets[_ticketId].used;
    }

    /** 
    * @dev Returns the resale status of a specific ticket
    */
    function getTicketResaleStatus(uint256 _ticketId) 
    public 
    view 
    returns (bool) 
    {
        return tickets[_ticketId].forSale;
    }

    /** 
    * @dev check ownership of ticket
    */
    function checkTicketOwnership(uint256 _ticketId) 
    external 
    view 
    returns (bool) 
    {
        require((ownerOf(_ticketId) == msg.sender),"no ownership of the given ticket");
        return true;
    }

/* Additional functions */ 
    
    /** 
    * @dev create initial ticket struct and generate ID (only ever called by BuyTicket function)
    */
    function _createTicket() 
    internal 
    EventNotStarted 
    isAvailable 
    returns (uint256) 
    {
        Ticket memory _ticket = Ticket({
            price: initialTicketPrice,
            forSale: bool(false),
            used: bool(false)
        });
        uint256 newTicketId = tickets.push(_ticket) - 1;
        return newTicketId;
    }

    /** 
    * @dev mint a Ticket (primary market)
    */
    function buyTicket() 
    external 
    payable 
    EventNotStarted 
    whenNotPaused 
    {   
        require((msg.value >= initialTicketPrice),"not enough money");
        
        if(msg.value > initialTicketPrice)
        {
            msg.sender.transfer(msg.value.sub(initialTicketPrice));
        }

        uint256 _ticketId = _createTicket();
        _mint(msg.sender, _ticketId);
        emit TicketCreated(msg.sender, _ticketId);
    }

    /** 
    * @dev approve a specific buyer of the ticket to buy my ticket
    */
    function approveAsBuyer(address _buyer, uint256 _ticketId) 
    public
    EventNotStarted 
    whenNotPaused 
    isTicketOwner(_ticketId)
    {
        approve(_buyer,_ticketId);
    }

    /** 
    * @dev buy request for a ticket available on secondary market (callable from any approved account/contract)
    */
    function buyTicketFromAttendee(uint256 _ticketId) 
    external 
    payable 
    EventNotStarted 
    whenNotPaused 
    {
        require(tickets[_ticketId].forSale = true,"ticket not for sale");
        require(getApproved(_ticketId) == msg.sender,"not approved");
        uint256 _priceToPay = tickets[_ticketId].price;
        address payable _seller = address(uint160(ownerOf(_ticketId)));
        require((msg.value >= _priceToPay),"not enough money");

        //Return overpaid amount to sender if necessary
        if(msg.value > _priceToPay)
        {
            msg.sender.transfer(msg.value.sub(_priceToPay));
        }

        // pay the seller (price - fee)
        uint256 _fee = _priceToPay.div(100).mul(transferFee);
        uint256 _netPrice = _priceToPay.sub(_fee);
        _seller.transfer(_netPrice);

        emit TicketSold(_seller, msg.sender, _ticketId, _priceToPay);
        safeTransferFrom(_seller, msg.sender, _ticketId);
        tickets[_ticketId].forSale = false;    
    }

    /** 
    * @dev burn a Ticket (if owner)
    */
    function destroyTicket(uint256 _ticketId) 
    public 
    isTicketOwner(_ticketId) 
    {
        _burn(_ticketId);
        emit TicketDestroyed(msg.sender, _ticketId);
    }
    
    /** 
    * @dev withdraw money stored in this contract
    */
    function withdrawBalance() 
    public 
    onlyOwner 
    {
        uint256 _contractBalance = uint256(address(this).balance);
        withdrawalAddress.transfer(_contractBalance);
        emit BalanceWithdrawn(msg.sender,withdrawalAddress,_contractBalance);
    }
}