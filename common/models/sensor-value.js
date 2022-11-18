"use strict";

module.exports = function (SensorValue) {
  SensorValue.observe("before save", async function (ctx) {
    const inst = ctx.data || ctx.instance;
    const device = await SensorValue.app.models.Device.findOne({
      where: {
        dev_min_range: {
          lte: inst.sv_value,
        },
        dev_max_range: {
          gte: inst.sv_value,
        }
      },
    });

    if (device) {
      inst.dev_id = device.id;
      inst.deviceName = device.dev_name;
    }
  });

  SensorValue.observe("after save", async function (ctx) {
    const value = ctx.instance.toJSON();
    const socket = SensorValue.app.io.sockets;

    if (socket) {
      const avg = await getAVG();
      socket.emit("CREATE_SensorValue", {
        ...value,
        formatedValue: value.sv_value.toFixed(2),
        deviceName:  value.deviceName ,
      });
      socket.emit("AVG_SensorValue", avg);
    }
  });

  const SqlPromise = function (sql, params) {
    return new Promise((resolve, reject) => {
      SensorValue.app.dataSources.postgres.connector.query(
        sql,
        params,
        function (err, res) {
          if (err) {
            var e = new Error(err.message);
            e.statusCode = 422;
            reject(e);
          } else {
            resolve(res);
          }
        }
      );
    });
  };

  SensorValue.getAVG = getAVG;
  SensorValue.remoteMethod("getAVG", {
    description: "Retrieve SensorValues for a logged in user.",
    accepts: [
      {
        arg: "req",
        type: "object",
        required: true,
        http: {
          source: "body",
        },
      },
      {
        arg: "options",
        type: "object",
        http: "optionsFromRequest",
      },
    ],
    returns: {
      type: "object",
      root: true,
    },
    http: {
      verb: "get",
      path: "/get-avgs",
    },
  });

  async function getAVG() {
    const sqlDay = `select round (AVG(sv_value)::DECIMAL, 2)::TEXT as avg from sensorvalue s 
	where createdat >= now() - interval '1 DAY'`;

    const sql30m = `select round (AVG(sv_value)::DECIMAL, 2)::TEXT as avg from sensorvalue s 
	where createdat >= now() - interval '30 min'`;

    const promises = [SqlPromise(sqlDay), SqlPromise(sql30m)];

    const responses = await Promise.all(promises);

    return {
      day: responses[0][0].avg || 0,
      mins: responses[1][0].avg || 0,
    };
  }

  SensorValue.searchValues = searchValues;
  SensorValue.remoteMethod("searchValues", {
    description: "Retrieve SensorValues for a logged in user.",
    accepts: [
      {
        arg: "req",
        type: "object",
        required: true,
        http: {
          source: "req",
        },
      },
      {
        arg: "options",
        type: "object",
        http: "optionsFromRequest",
      },
    ],
    returns: {
      type: "object",
      root: true,
    },
    http: {
      verb: "get",
      path: "/search-values",
    },
  });

  async function searchValues(req) {
    //   select TIMESTAMP '2017-08-24 17:45:42' AT TIME ZONE 'ADT', * from sensorvalue s
    // --where now()

    const {
      query: { date, dev_id },
    } = req;

    const values = JSON.parse(date);

    let query = "";

    if (values.date) query += ` createdat::DATE = '${values.date}'::DATE `;
    else if (values.dateInit)
      query += ` createdat >= '${values.dateInit}'  AT TIME ZONE 'ADT' AND createdat <= '${values.dateEnd}'  AT TIME ZONE 'ADT' `;

    if(dev_id) query += ` AND dev_id = ${dev_id}`

    const sqlDay = `
    SELECT count(*),
        ROUND (MAX(sv_value)::numeric,2) as max,
        ROUND (MIN(sv_value)::numeric,2) as min,
        ROUND (avg(sv_value)::numeric,2) as avg,
        ROUND (PERCENTILE_CONT(0.5) WITHIN GROUP(ORDER BY sv_value)::numeric,2) as median,
        json_build_object('values',array_agg(s.*)) as values,
        (select extract(epoch from SUM(date))/3600 as hour from (SELECT row_number() OVER w - 1,
          createdat - lag(createdat) OVER w as date
          FROM sensorvalue
          WHERE ${query}
          WINDOW w AS (ORDER BY createdat)
          ORDER BY createdat) as y
          WHERE date < '15 seconds'::interval ) AS hours
    FROM sensorvalue s
      WHERE ${query}
`;

    // select extract(epoch from SUM(date))/3600 as hour from (SELECT row_number() OVER w - 1,
    // createdat - lag(createdat) OVER w as date
    // FROM sensorvalue
    // WINDOW w AS (ORDER BY createdat)
    // ORDER BY createdat) as y
    // where date < '15 seconds'::interval

    const promises = [SqlPromise(sqlDay)];

    const responses = await Promise.all(promises);

    return {
      data: responses[0][0],
    };
  }
};
