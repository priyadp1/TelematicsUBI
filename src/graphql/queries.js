/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getDriverFeature = /* GraphQL */ `
  query GetDriverFeature($id: ID!) {
    getDriverFeature(id: $id) {
      id
      driverId
      date
      miles
      trips
      durationH
      speedMean
      speedStd
      harshBrakeRate
      harshAccelRate
      sharpTurnRate
      nightPct
      schoolZonePct
      riskScore
      premium
      updatedAt
      createdAt
      __typename
    }
  }
`;
export const listDriverFeatures = /* GraphQL */ `
  query ListDriverFeatures(
    $filter: ModelDriverFeatureFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listDriverFeatures(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        driverId
        date
        miles
        trips
        durationH
        speedMean
        speedStd
        harshBrakeRate
        harshAccelRate
        sharpTurnRate
        nightPct
        schoolZonePct
        riskScore
        premium
        updatedAt
        createdAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getTripEvent = /* GraphQL */ `
  query GetTripEvent($id: ID!) {
    getTripEvent(id: $id) {
      id
      driverId
      ts
      speed
      accel
      brake
      lat
      lon
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listTripEvents = /* GraphQL */ `
  query ListTripEvents(
    $filter: ModelTripEventFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listTripEvents(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        driverId
        ts
        speed
        accel
        brake
        lat
        lon
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const featuresByDriver = /* GraphQL */ `
  query FeaturesByDriver(
    $driverId: String!
    $date: ModelStringKeyConditionInput
    $sortDirection: ModelSortDirection
    $filter: ModelDriverFeatureFilterInput
    $limit: Int
    $nextToken: String
  ) {
    featuresByDriver(
      driverId: $driverId
      date: $date
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        driverId
        date
        miles
        trips
        durationH
        speedMean
        speedStd
        harshBrakeRate
        harshAccelRate
        sharpTurnRate
        nightPct
        schoolZonePct
        riskScore
        premium
        updatedAt
        createdAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const eventsByDriver = /* GraphQL */ `
  query EventsByDriver(
    $driverId: String!
    $ts: ModelStringKeyConditionInput
    $sortDirection: ModelSortDirection
    $filter: ModelTripEventFilterInput
    $limit: Int
    $nextToken: String
  ) {
    eventsByDriver(
      driverId: $driverId
      ts: $ts
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        driverId
        ts
        speed
        accel
        brake
        lat
        lon
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
