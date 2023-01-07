"use strict";

/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           ORDER BY last_name, first_name`
    );
    return results.rows.map((c) => new Customer(c));
  }

  /** get a customer by ID. */
  // TODO: REMINDER: WHY ARE WE GOING TO SNAKE CASED HERE?
  static async get(id) {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           WHERE id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers
             SET first_name=$1,
                 last_name=$2,
                 phone=$3,
                 notes=$4
             WHERE id = $5`,
        [this.firstName, this.lastName, this.phone, this.notes, this.id]
      );
    }
  }

  /* Part 4 */
  /* return full name of customer - instance method */
  fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  /* PART 6 */
  /* Serach function - Class function */

  static async searchName(name) {
    const results = await db.query(
      `SELECT id,
          first_name AS "firstName",
          last_name  AS "lastName",
          phone,
          notes
      FROM customers
      WHERE first_name ILIKE $1 OR last_name ILIKE $1
      OR first_name ILIKE $1 AND last_name ILIKE $1
      ORDER BY last_name, first_name`,
      [`%${name}%`]
    );
    // TODO: LOOK INTO CONCAT <-- concat first and last and then search
    // first last ILIKE $1
    // TODO: THIS DIDNT WORK: OR first_name ILIKE $1 AND last_name ILIKE $1
    // if I type in full name like 'jessica abbot' it returns empty,
    // but typing in a firstname or a last name works.
    const customers = results.rows;
    debugger;
    if (customers === undefined) {
      const err = new Error(`No such customer: ${name}`);
      err.status = 404;
      throw err;
    }

    return results.rows.map((c) => new Customer(c));
  }

  /* Part 7 */
  /* Returns top 10 customers */

  static async topCustomers() {
    let top10Results = [];
    // get all reservations, order by or group by user
    const reservationResults = await db.query(
      `SELECT
      customer_id AS "customerId",
      COUNT(*)
      FROM reservations
      GROUP BY customer_id
      ORDER BY COUNT(*) DESC
      LIMIT 10`
    );

    // query for each user
    for (const reservation in reservationResults.rows) {
      const customer = reservationResults.rows[reservation];
      const customerId = customer.customerId; // extract customer id

      const userResults = await db.query(
        `SELECT id,
            first_name AS "firstName",
            last_name  AS "lastName",
            phone,
            notes
        FROM customers
        WHERE id = $1
        ORDER BY last_name, first_name`,
        [customerId]
      );
      top10Results.push(userResults.rows[0]);
    }
    // get those users
    const results = top10Results;

    return results.map((c) => new Customer(c));
    // TODO: LOOK AT USING JOIN TO ONLY USE 1 QUERY
    // if i have to use javascript to use N operations, instead do it int the database query.
    // operation above hits database 10 times. (EXPENSIVE)
    // hit it ones
  }
}

module.exports = Customer;
