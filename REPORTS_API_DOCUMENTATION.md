# Reports API

All report endpoints require an authenticated admin session.

## `GET /api/reports/summary`

Optional query parameters: `start_date` and `end_date` in `YYYY-MM-DD` format. The end date is inclusive. If omitted, the endpoint summarizes all available records.

The response contains payment totals by verification status, order counts/value/current outstanding balance, expenses by category, the five most ordered products, monthly/daily trends, and a recorded cash summary. Cancelled orders are excluded from order value, outstanding balance, and product rankings. Outstanding balance is calculated from all verified payments to date for non-cancelled orders created in the selected period. Payments are grouped by `paid_at` when verified and by `created_at` while pending or rejected. Orders use `order_date`; expenses use `expense_date`.

`cashSummary.netRecordedCash` is verified payments minus recorded expenses. It is not net profit because production costs and other unrecorded costs may be missing.

## `GET /api/reports/export`

Exports every matching row as UTF-8 CSV, including a byte-order mark for spreadsheet compatibility.

Required query parameter: `type=payments`, `type=orders`, or `type=expenses`.

Optional filters: `start_date`, `end_date`; for payments, `status` and `payment_method`; for orders, `status` and `payment_status`. The date basis follows the summary endpoint. Export applies the selected filters to the full matching dataset, independent of the current UI page.

## Related paginated endpoints

- `GET /api/payments` accepts `page`, `limit`, `status`, `payment_method`, `start_date`, and `end_date`.
- `GET /api/orders` accepts `page`, `limit`, `status`, `payment_status`, `order_date_start`, and `order_date_end`.
- `GET /api/expenses` accepts `page`, `limit`, `start_date`, and `end_date`.

Date range endpoints treat the end date as inclusive.
