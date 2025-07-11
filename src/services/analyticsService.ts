import mongoose from "mongoose";

export async function getEventAnalytics(
  eventId: string,
  selectedMonth?: string,
  selectedCurrency?: string
) {
  const pipeline: any[] = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(eventId)
      }
    },

    // Lookup related data
    {
      $lookup: {
        from: 'transactions',
        localField: '_id',
        foreignField: 'event',
        as: 'purchases',
      }
    },
    {
      $lookup: {
        from: 'feedbacks',
        localField: '_id',
        foreignField: 'event',
        as: 'ratings',
      }
    },
    {
      $lookup: {
        from: 'views',
        localField: '_id',
        foreignField: 'event',
        as: 'viewerData',
      }
    },
    {
      $lookup: {
        from: 'chatmessages',
        localField: '_id',
        foreignField: 'event',
        as: 'chatMessages',
      }
    },

    // Analytics summary projection
    {
      $project: {
        _id: 1,
        name: 1,

        // Earnings
        earnings: {
          totalRevenue: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$purchases",
                    as: "purchase",
                    cond: {
                      $and: [
                        selectedCurrency
                          ? { $eq: ["$$purchase.currency", selectedCurrency] }
                          : {},
                        selectedMonth
                          ? {
                              $eq: [
                                {
                                  $dateToString: {
                                    format: "%Y-%m",
                                    date: "$$purchase.createdAt"
                                  }
                                },
                                selectedMonth
                              ]
                            }
                          : {}
                      ]
                    }
                  }
                },
                as: "purchase",
                in: { $toDouble: "$$purchase.amount" }
              }
            }
          },
          totalTransactions: {
            $size: {
              $filter: {
                input: "$purchases",
                as: "purchase",
                cond: {
                  $and: [
                    selectedCurrency
                      ? { $eq: ["$$purchase.currency", selectedCurrency] }
                      : {},
                    selectedMonth
                      ? {
                          $eq: [
                            {
                              $dateToString: {
                                format: "%Y-%m",
                                date: "$$purchase.createdAt"
                              }
                            },
                            selectedMonth
                          ]
                        }
                      : {}
                  ]
                }
              }
            }
          },
          transactions: {
            $map: {
              input: {
                $filter: {
                  input: "$purchases",
                  as: "purchase",
                  cond: {
                    $and: [
                      selectedCurrency
                        ? { $eq: ["$$purchase.currency", selectedCurrency] }
                        : {},
                      selectedMonth
                        ? {
                            $eq: [
                              {
                                $dateToString: {
                                  format: "%Y-%m",
                                  date: "$$purchase.createdAt"
                                }
                              },
                              selectedMonth
                            ]
                          }
                        : {}
                    ]
                  }
                }
              },
              as: "purchase",
              in: {
                date: {
                  $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$$purchase.createdAt"
                  }
                },
                amount: { $toDouble: "$$purchase.amount" }
              }
            }
          }
        },

        // Viewers
        viewers: {
          total: { $size: "$viewerData" },
          replay: {
            $size: {
              $filter: {
                input: "$viewerData",
                as: "view",
                cond: { $eq: ["$$view.type", "replay"] }
              }
            }
          },
          peak: {
            $max: "$viewerData.concurrentViewers"
          }
        },

        // Ratings
        ratings: {
          avg: { $avg: "$ratings.ratings" },
          count: { $size: "$ratings" },
          breakdown: {
            $arrayToObject: {
              $map: {
                input: [1, 2, 3, 4, 5],
                as: "star",
                in: {
                  k: { $toString: "$$star" },
                  v: {
                    $size: {
                      $filter: {
                        input: "$ratings",
                        as: "rating",
                        cond: { $eq: ["$$rating.ratings", "$$star"] }
                      }
                    }
                  }
                }
              }
            }
          }
        },

        // Chat message count
        chat: {
          count: { $size: "$chatMessages" }
        },

        // Feedback list (last 10 comments)
        feedback: {
          $slice: [
            {
              $map: {
                input: {
                  $filter: {
                    input: "$ratings",
                    as: "r",
                    cond: { $ne: ["$$r.comments", null] }
                  }
                },
                as: "f",
                in: {
                  id: { $toString: "$$f._id" },
                  comment: "$$f.comments",
                  rating: "$$f.ratings",
                  userName: "$$f.userName",
                  createdAt: "$$f.createdAt"
                }
              }
            },
            10
          ]
        }
      }
    }
  ];

  return pipeline;
}

