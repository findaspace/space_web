# Design research and decisions

Findaspace borrows useful marketplace patterns while adapting them to Ghana's direct-contact model and a much broader definition of space. This is a design synthesis, not a statistical claim that subscriptions equal individual users or that every Ghana renter behaves alike.

## Sources consulted

- Airbnb search and filters: https://www.airbnb.com/help/article/479 and https://www.airbnb.com/help/article/252 — visual discovery, price/type filters, wishlists and map/list exploration.
- Ghana National Communications Authority mobile-data publications: https://nca.org.gh/mobile-data/ — grounds the need to take mobile access seriously alongside the user's explicit phone-first requirement. Subscription counts do not measure unique people or prove device preference.
- GhanaPostGPS: https://www.ghanapostgps.com/ — unique digital addresses; supports keeping a digital-address field alongside readable location descriptions.
- Ghana Parliament Rent Act source: https://ir.parliament.gh/bitstream/handle/123456789/2063/ACT%2B220%2BRev%2BEd.pdf?isAllowed=y&sequence=3 — safety and advance-rent wording should reflect the applicable tenancy, not a universal six-month rule.
- Ghana property marketplace Meqasa: https://meqasa.com/ — local property discovery and enquiries provide a relevant comparison for contact-led housing.
- Peerspace: https://www.peerspace.com/ — broader space discovery and hourly venue use; useful for the eventual non-housing taxonomy.
- Playfinder: https://www.playfinder.com/ — sport/facility discovery is a distinct use case, requiring facility and availability details rather than ordinary residential fields.

## Applied decisions

| Finding or comparison | Findaspace decision |
| --- | --- |
| Photo-led marketplace discovery helps people compare spaces quickly | Large cards, honest rates, real locality/landmark information and swipeable galleries |
| Different spaces serve different intentions | Homes, Hostels, Workspaces, Events & studios and More grouped from actual API types |
| Rentals here begin with a conversation | Owner/manager contact, phone reveal, WhatsApp and messages; payments off |
| Phone-first interaction needs reachable controls and short forms | Bottom navigation, mobile search sheet, sticky contact action and staged host flow |
| People may return to compare a shortlist | Device favourites that work before sign-in, clearly labelled as local |
| Photos and maps can be expensive on mobile connections | Compressed uploads, lazy images and optional on-demand map loading; measured route JavaScript budgets |
| Digital addresses help directions but do not communicate every neighbourhood detail | Optional GhanaPostGPS plus area, landmark and map coordinates |
| Sports bookings and hostel academic periods have different semantics | The companion API now supports sports and academic price periods; availability is still arranged by direct contact |
| Trust must be backed by evidence | No invented verified-host badges, ratings, report acknowledgements or payment guarantees |

The interface uses the supplied black-and-white logos, a restrained monochrome UI and colour photography. Desktop offers denser grids and wider galleries; mobile prioritises one-handed browsing, clear form states and large targets. These decisions were checked in a browser at widths from 320px to 1920px, not just in static mockups.
